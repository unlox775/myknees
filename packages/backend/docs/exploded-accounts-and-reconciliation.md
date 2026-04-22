# Exploded accounts and cross-account reconciliation

This document captures the **product intent** for “exploded” accounts (parent money source vs child ledgers), how that maps to the **current database design**, and what is **implemented vs still to build**. It complements the table-level description in [architecture.md](./architecture.md).

## Concepts (vocabulary)

### Money-source vs detail ledgers

In a simple hierarchy, one account (e.g. Ally Bank) is the main **money source**. Other accounts are **ledgers** you also import: credit cards, brokerages, merchant receipt accounts (Walmart, Costco, Amazon), etc. The system must not double-count flows that are really **transfers** or **the same purchase explained at two levels of detail**.

### Type A — Transaction-level explosion (transfer reconciliation)

**Intent:** A movement appears as a row in account X and a matching row in account Y (opposite sign convention is OK: e.g. debit at Ally, credit at Capital One for the same payment).

**Goal:** Establish a **1:1 link** between the two transaction rows. Once linked, **expense and cash-flow reporting treats the pair as a validated transfer** — not as spend in the funding account and income in the card; the link “explains” one side relative to the other.

**Urgency:** If these stay unlinked, aggregates are wrong (false expenses, false income).

**Detection (implemented for transfers):** Configurable **reconciliation relationships** pair two accounts (A = fund source, B = destination ledger). Per-side **patterns** match `normalized_equals` / `normalized_contains` / `raw_contains` using the **same live parsers** as classification (`parser.normalize(description)` on each transaction — not the cached `classification_normalized` table). Prefer **`normalized_equals` + one canonical phrase per flow** (extend Ally / Capital One parsers so variants collapse to that phrase). **`exclude=1` patterns** drop a row from scope if they match (e.g. auto loan vs credit card). Pairs require **compatible magnitudes** and **dates** within `date_slippage_days`. See [Type A transfer tooling](#type-a-transfer-tooling) below.

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
| “Explosion mode” per account (Type A vs B, parent id, merchant id) | **Not present** — `accounts` has `identifier`, `name`, `type`, optional `parse_format_id` (migration `20250422100000_*`) |
| Many-to-many transfer rules (same card, multiple banks) | **Partial** — add **one relationship row per ordered pair** (A→B); same two accounts with reversed A/B if you need both directions as separate matchers |
| Stored “reconciliation status”, confidence, or user lock | **Not present** |
| Mutual consistency (if A links B, B links A) | **Not implemented** — single FK direction only |

## What is already implemented

1. **Tables and FKs** — `accounts`, `transactions` (`linked_transaction_id`), `line_items` (link columns) from `20250131000000_create_initial_schema.js`.
2. **`accounts.parse_format_id`** — Added when missing by migration [`20250422100000_accounts_parse_format_and_transfer_reconciliation.js`](../src/db/migrations/20250422100000_accounts_parse_format_and_transfer_reconciliation.js).
3. **Transfer reconciliation schema** — `reconciliation_relationships` (pair of accounts, `date_slippage_days`, `amount_tolerance`, `active`) and `reconciliation_relationship_patterns` (`side` `a`|`b`, `match_kind`, `pattern`, `exclude` 0|1).
4. **Matcher + jobs** — [`src/reconciliation/transfer-relationship-reconciler.js`](../src/reconciliation/transfer-relationship-reconciler.js): clears A→B links for a relationship (`--force`), pairs rows, writes **`transactions.linked_transaction_id` on account A only** → B. Post-import hook [`run-after-import.js`](../src/reconciliation/run-after-import.js).
5. **CLI** — `npm run reconcile:seed-ally-capital-one`, `npm run reconcile:transfers`, `npm run reconcile:report`; import calls reconcile unless `--skip-reconcile`.
6. **Repositories + library** — [`src/index.js`](../src/index.js) exports `reconciliation.*`.

## Type A transfer tooling

| Command | Purpose |
|--------|---------|
| `npm run reconcile:seed-ally-capital-one` | Creates Ally_Bank → Capital_One relationship with **tight** patterns (`normalized_equals` canonical phrases) if that pair does not exist. |
| `npm run reconcile:patch-ally-c1-patterns` | **Existing DBs:** replace old fuzzy Ally↔Capital One patterns with card-only `normalized_equals` rows + auto-loan exclude. Then run `reconcile:transfers -- --relationship=1 --force`. |
| `npm run reconcile:status` | **Read-only:** same as `--all` if you pass nothing else. Counts linked vs unmatched, sample rows. **No DB writes, no matcher.** |
| `npm run reconcile:status -- --all` | Same, all relationships explicitly. |
| `npm run reconcile:status -- --relationship=1 --strict` | Same; **exit 1** if any gaps (for scripts/CI). |
| `npm run reconcile:transfers -- --all` | **Writes links:** run matcher on every relationship; human summary with ✓/✗, samples (use `--json` for machine-only). |
| `npm run reconcile:transfers -- --relationship=1` | Matcher for one relationship. |
| `npm run reconcile:transfers -- --relationship=1 --force` | **Clear** A→B links for that relationship, then **re-link**. |
| `npm run reconcile:transfers -- --relationship=1 --dry-run` | No writes; human summary shows what **would** link. |
| `npm run reconcile:transfers -- --sample=20` | Show up to 20 sample rows per unmatched list (default **15**; newest dates first). |
| `npm run reconcile:report` | Writes `data/reconciliation-reports/<timestamp>/` for **all** relationships if you pass no scope (same default as status). |
| `npm run reconcile:report -- --all` | Same, explicit. Matcher **dry-run** + full lists — not the same as `reconcile:status`. |

**Patterns:** Include patterns **OR** together on a side. **Exclude** patterns (`exclude=1`) remove a row if they match. **Many banks → one card:** one relationship per funding account; tune parsers so each bank’s card payment line normalizes to the **same** string you put in `normalized_equals`, or add one include phrase per bank if you must.

**Still to improve**

- **Ambiguity:** multiple same-amount candidates within the date window → no auto-link; listed in JSON / report. Tie-break uses **closest posting date** only when strictly closer than the second best.
- **Expense rollup / “leaf” queries** — not yet a shipped SQL view; links are stored for downstream reporting.
- **Manual override UI** — use `sql-console` / repository `update` for now.

## What is not implemented (yet)

1. **Automatic sharding / parent-child accounts** — No `parent_account_id` or rollup graph.
2. **Type B receipt reconciliation** — No parent txn + `line_items` import path tied to card rows; no merchant “ignore until linked” rollups.
3. **DB CHECKs** — “Linked row must be different account” enforced in matcher only.
4. **Manual link editor / audit trail** — no first-class UI or `linked_by` column.

## Suggested implementation phases (updated)

### Phase 1 — Account metadata and invariants (partially done)

- ~~`accounts.parse_format_id` migration~~ **Done** (same migration as reconciliation tables).
- Still open: **explosion role**, **`parent_account_id`**, optional unique guard so one B row cannot be targeted twice.

### Phase 2 — Type A matcher + reports (largely done)

- ~~Candidate generation, persistence on A→B, reports~~ **Done** via relationships + `reconcile:report`.
- **Acceptance (ongoing):** tune patterns and `date_slippage_days` / `amount_tolerance` per institution; review `unmatchedA` / `unmatchedB` in reports for payments from **other** banks or description drift.

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
| Schema (core) | [`src/db/migrations/20250131000000_create_initial_schema.js`](../src/db/migrations/20250131000000_create_initial_schema.js) |
| Schema (parse_format + reconciliation) | [`src/db/migrations/20250422100000_accounts_parse_format_and_transfer_reconciliation.js`](../src/db/migrations/20250422100000_accounts_parse_format_and_transfer_reconciliation.js) |
| Schema (`patterns.exclude`) | [`src/db/migrations/20250423120000_reconciliation_pattern_exclude.js`](../src/db/migrations/20250423120000_reconciliation_pattern_exclude.js) |
| Import + post-import reconcile | [`scripts/import-transaction-records.js`](../scripts/import-transaction-records.js) (`--skip-reconcile` to disable) |
| Matcher | [`src/reconciliation/transfer-relationship-reconciler.js`](../src/reconciliation/transfer-relationship-reconciler.js) |
| Read-only status | [`src/reconciliation/relationship-status.js`](../src/reconciliation/relationship-status.js), [`scripts/reconciliation-status.js`](../scripts/reconciliation-status.js) |
| CLI formatting | [`src/reconciliation/cli-output.js`](../src/reconciliation/cli-output.js) |
| CLI | [`scripts/auto-reconcile-transfer-relationships.js`](../scripts/auto-reconcile-transfer-relationships.js), [`scripts/reconciliation-relationship-report.js`](../scripts/reconciliation-relationship-report.js), [`scripts/seed-ally-capital-one-relationship.js`](../scripts/seed-ally-capital-one-relationship.js), [`scripts/patch-ally-capital-one-card-only-patterns.js`](../scripts/patch-ally-capital-one-card-only-patterns.js) |
| Parsers (canonical phrases) | [`src/classification/parsers/ally-bank-parser.js`](../src/classification/parsers/ally-bank-parser.js), [`src/classification/parsers/capital-one-parser.js`](../src/classification/parsers/capital-one-parser.js) |
| Transactions API | [`src/repositories/transactions.js`](../src/repositories/transactions.js) |
| Line items API | [`src/repositories/line-items.js`](../src/repositories/line-items.js) |
| Core architecture | [architecture.md](./architecture.md) |
