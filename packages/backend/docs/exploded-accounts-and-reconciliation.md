# Exploded accounts and cross-account reconciliation

This document captures the **product intent** for “exploded” accounts (parent money source vs child ledgers), how that maps to the **current database design**, and what is **implemented vs still to build**. It complements the table-level description in [architecture.md](./architecture.md).

## Concepts (vocabulary)

### Money-source vs detail ledgers

In a simple hierarchy, one account (e.g. Ally Bank) is the main **money source**. Other accounts are **ledgers** you also import: credit cards, brokerages, merchant receipt accounts (Walmart, Costco, Amazon), etc. The system must not double-count flows that are really **transfers** or **the same purchase explained at two levels of detail**.

### Type A — Transaction-level explosion (transfer reconciliation)

**Intent:** A movement appears as a row in account X and a matching row in account Y (opposite sign convention is OK: e.g. debit at Ally, credit at Capital One for the same payment).

**Goal:** Establish a **1:1 link** between the two transaction rows. Once linked, **expense and cash-flow reporting treats the pair as a validated transfer** — not as spend in the funding account and income in the card; the link “explains” one side relative to the other.

**Urgency:** If these stay unlinked, aggregates are wrong (false expenses, false income).

**Detection (planned):** Often driven by **normalized descriptions** (e.g. both institutions label the payment similarly after normalization), plus **date** and **amount** (with sign rules). Ambiguity (2–3 candidates) requires explicit disambiguation or a stored link.

### Type B — Detail explosion (receipt / sub-ledger reconciliation)

**Intent:** A **single** card or bank row (e.g. “Walmart $101”) is the parent fact; a **merchant or receipt account** has **many line items** (each receipt line) that roll up to the same purchase.

**Goal:** All receipt lines that belong to one purchase share a **logical purchase identity** (in practice: same external **transaction id** and **date** from the merchant export — not necessarily unique per line, but **distinct (transaction_id, date)** identifies one basket**). Lines are **linked** from receipt detail → the card transaction (typically **line_item.linked_transaction_id** or **linked_line_item_id** per [architecture.md](./architecture.md)).

**Reporting rule:**

- **Before** the card row is linked to the receipt bundle: the **card** row still counts (e.g. groceries). **Detail lines** on the merchant account should **not** count toward spend (they are “unreconciled detail” — noise until mapped).
- **After** reconciliation: the **card** row is **excluded** from spend (it is explained). **Receipt line items** become the **authoritative breakdown** for categorization and totals.

**Urgency:** Wrong if both sides count; acceptable to leave merchant lines ignored until the link exists.

### Unmodeled accounts (e.g. future Edward Jones)

If you transfer **out** of Ally to an account that is **not** imported (or not configured for Type A), Ally will show a large outflow with **no other-side row**. That will look like a **huge expense** until the destination exists and is reconciled (or classified as transfer/investment with a policy). No code today automates that warning.

## Mapping to the current data model

| Idea | Schema / code today |
|------|---------------------|
| Link two transactions across accounts | `transactions.linked_transaction_id` → `transactions.id` (documented; must be **different** account — enforced in app/docs only, not DB CHECK) |
| Link a receipt line to another account’s transaction | `line_items.linked_transaction_id` |
| Link line to line | `line_items.linked_line_item_id` |
| “Explosion mode” per account (Type A vs B, parent id, merchant id) | **Not present** — `accounts` has `identifier`, `name`, `type`, optional `parse_format_id` in code only (see [Schema gaps](#schema-gaps)) |
| Stored “reconciliation status”, confidence, or user lock | **Not present** |
| Mutual consistency (if A links B, B links A) | **Not implemented** — single FK direction only |

## What is already implemented

1. **Tables and FKs** — `accounts`, `transactions` (with `linked_transaction_id`), `line_items` (with `linked_transaction_id` and `linked_line_item_id`) from migration `20250131000000_create_initial_schema.js`.
2. **Documentation of reconciliation theory** — [architecture.md](./architecture.md) § “Reconciliation Theory” and line-item linking notes.
3. **Repositories** — `transactions.create` / `update` accept `linked_transaction_id`; `line-items` repository supports link fields on create/update ([`src/repositories/transactions.js`](../src/repositories/transactions.js), [`src/repositories/line-items.js`](../src/repositories/line-items.js)).
4. **Library entrypoint** — [`src/index.js`](../src/index.js) exports `accounts`, `transactions`, `lineItems` for programmatic use.
5. **Classification** — `parse_formats`, normalizers, and mapping tables support **consistent naming** *inputs* for future matchers (no matcher wired to links yet).

## What is not implemented (today)

1. **Automatic sharding / parent-child accounts** — No `parent_account_id`, no graph of “this account explodes into these children,” no automatic rollup.
2. **Import pipeline never sets links** — [`scripts/import-transaction-records.js`](../scripts/import-transaction-records.js) inserts `account_id`, `date`, `description`, `amount`, timestamps only. It does **not** set `linked_transaction_id`, populate `line_items`, or run reconciliation.
3. **No reconciliation engine** — No job that pairs Ally ↔ Capital One rows by normalized description + amount + date, no 1:1 validation report, no handling of ambiguous duplicates.
4. **No reporting queries** for “unreconciled Type A (must fix)” vs “unreconciled Type B (expected until linked)” vs “leaf rows for expense sum.”
5. **No policy layer** — “Ignore unreconciled merchant lines,” “exclude explained card row,” “treat unlinked large outflows as warnings” are **behaviors to implement**, not SQL views in repo.
6. **Receipt import as line items** — `costco_receipts` exists as a **parse format** for classification/normalization; the same CSV path still creates **flat `transactions` rows**, not a parent transaction + `line_items` tree tied to a card purchase.
7. **DB enforcement** — “Linked row must be different account” and “at most one of `linked_transaction_id` / `linked_line_item_id` on line_items” are documented constraints, not database CHECKs or triggers.

## Schema gaps (engineering note)

- **`accounts.parse_format_id`** is read/written in [`scripts/add-account.js`](../scripts/add-account.js) and [`src/repositories/accounts.js`](../src/repositories/accounts.js) and referenced in import, but **no migration in this repo adds `parse_format_id` to `accounts`**. Fresh installs from migrations alone may not match what the scripts expect until a migration is added (or the column exists from manual DDL).

## Suggested implementation phases

Phases are ordered so Type A (transfers) unblocks correct totals before Type B (receipt beauty).

### Phase 1 — Account metadata and invariants

- Add migration: `accounts.parse_format_id` (if missing), and new columns or tables for **explosion role** (e.g. `none` \| `transfer_counterparty` \| `detail_merchant`) and optional **`parent_account_id`** or a separate **`account_links`** table if many-to-many is needed later.
- Add DB or application checks: linked transactions must reference different `account_id`; optional unique index strategies to prevent one-to-many accidental links (product decision).

### Phase 2 — Type A matcher + reports

- **Candidate generation:** same calendar `date` (or ±N days for posting lag), amount match with sign convention per pair of account types, normalized description match (reuse `classification_normalized` or a dedicated “payment fingerprint” table).
- **Persistence:** write `linked_transaction_id` on one or both rows; define canonical direction (e.g. always fund-source → card).
- **Reports:** “Ally rows that look like payments to linked accounts but have **no** counterpart”; “Capital One credits that look like payments with **no** Ally debit”; “ambiguous (count > 1)” for manual resolution.

**Acceptance criteria (Type A):**

- For configured account pairs, every normalized payment pattern in scope either has a **unique** 1:1 link or appears on an **exceptions** report.
- Running expense rollup on test data **does not** double-count a linked transfer (definition of “which side is leaf” is explicit and tested).

### Phase 3 — Type B receipt model + import

- Import path creates **one parent transaction** per merchant `(transaction_id, date)` (or per file section) and **N `line_items`**.
- Unreconciled merchant lines: **excluded** from spend queries by default.
- Link receipt lines (or parent) to the **card transaction**; after link, **card row excluded**, **lines included**.

**Acceptance criteria (Type B):**

- Given a synthetic Walmart receipt + Capital One row, after linking, category totals use **only** receipt lines, not the card duplicate.
- Unlinked receipt lines never inflate spend.

### Phase 4 — UX / ops

- Manual link override, unlink, and “mark as transfer without counterparty” (last resort) with audit fields (`updated_at`, optional `linked_by`, reason).

## Testing strategy (when built)

- **Fixtures:** small SQLite DBs with Ally + Capital One CSV fragments and known ground-truth links.
- **Property tests:** sum of “reportable leaf” amounts invariant under linking/unlinking for Type A.
- **Regression:** import idempotency must not wipe `linked_transaction_id` on re-import (today import does not touch links; future merges must preserve links or re-run matcher safely).

## Related files

| Area | Path |
|------|------|
| Schema | [`src/db/migrations/20250131000000_create_initial_schema.js`](../src/db/migrations/20250131000000_create_initial_schema.js) |
| Import (no links) | [`scripts/import-transaction-records.js`](../scripts/import-transaction-records.js) |
| Transactions API | [`src/repositories/transactions.js`](../src/repositories/transactions.js) |
| Line items API | [`src/repositories/line-items.js`](../src/repositories/line-items.js) |
| Core architecture | [architecture.md](./architecture.md) |
