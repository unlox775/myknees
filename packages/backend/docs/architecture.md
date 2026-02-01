# Backend Architecture: Data Store & Financial Model

## Overview

The MyKnees backend stores financial data locally (Mac: `~/.myknees/`) or via a configured remote endpoint (PostgreSQL). It provides a Mint-like model: **accounts**, **transactions**, and **transaction line items (breakdowns)** with cross-account linking for reconciliation.

## Design Principles

1. **Single source of truth**: By linking transactions and line items across accounts, we avoid double-counting. A transaction that is "explained" by another (e.g., a credit card payment from a bank) is linked; when summing, we use the unlinked / leaf side.
2. **Breakdowns**: A transaction can have one or more line items (e.g., a Walmart receipt with multiple items). Line items start 1:1 but can be split. Line items can link to other transactions or line items in different accounts for reconciliation.
3. **Common SQL subset**: The data layer uses SQL that works on both SQLite and PostgreSQL so the same code runs locally or remotely.

## Data Store Location

- **Mac**: `~/.myknees/backend/` is created by `make data-store`. Contains:
  - `imports/` — drop-in folder for files (e.g., from ScrapedKnees). Files should start with an account identifier (e.g., `Capital_One_2025-07.csv`).
  - `imports/ignore/` — optional folder for reference/misc files (e.g., archived spreadsheets). Not processed as imports.
  - `data/` — SQLite database file and any local DB artifacts.
  - `backups/` — rotated backups of `imports` and `data`.
- **Non-Mac**: The app expects a configured data endpoint (e.g., PostgreSQL connection string). Local `~/.myknees/backend/` is not created; users must configure a remote store.

## Database Schema

### Accounts

Represents a single financial account (bank, credit card, cash). The `identifier` is used for import file naming (e.g., `Capital_One`, `Ally_Bank`, `Rose_credit_card`).

| Column       | Type     | Notes                                                                 |
|-------------|----------|-----------------------------------------------------------------------|
| id          | INTEGER  | Primary key (auto)                                                    |
| identifier  | TEXT     | Unique slug for imports (e.g. Capital_One)                            |
| name        | TEXT     | Display name                                                          |
| type        | TEXT     | `bank`, `credit_card`, `cash`                                         |
| created_at  | [timestamp with time zone*](#dates-and-timestamps) | Display in local TZ in app |
| updated_at  | [timestamp with time zone*](#dates-and-timestamps) | Display in local TZ in app |

### Transactions

One row per transaction in an account (date, description, amount, categorization). Can optionally link to one other transaction in a *different* account (reconciliation).

| Column               | Type    | Notes                                                                 |
|----------------------|---------|-----------------------------------------------------------------------|
| id                   | INTEGER | Primary key                                                           |
| account_id           | INTEGER | FK → accounts.id                                                      |
| date                 | DATE*   | Transaction date only (no time). [Details](#dates-and-timestamps).        |
| description          | TEXT    | Payee / memo from source                                              |
| amount               | REAL    | Signed (negative = debit/outflow)                                     |
| source_category      | TEXT    | Category from bank/CSV (automated)                                    |
| source_subcategory   | TEXT    | Subcategory from source                                               |
| category             | TEXT    | Our final category                                                    |
| subcategory          | TEXT    | Our final subcategory                                                 |
| transaction_type     | TEXT    | Our classification (e.g. expense, transfer)                           |
| linked_transaction_id| INTEGER | FK → transactions.id (other account); nullable                       |
| created_at           | [timestamp with time zone*](#dates-and-timestamps) | Display in local TZ in app |
| updated_at           | [timestamp with time zone*](#dates-and-timestamps) | Display in local TZ in app |

**Linking rule**: `linked_transaction_id` must reference a transaction in a *different* account. That linked transaction is the "other side" (e.g., Capital One payment from Ally). For reporting, a transaction that has a link can be treated as "explained" so we don’t double-count.

### Line Items (Breakdowns)

A transaction can have one or more line items (e.g., receipt line items). Starts 1:1; can be split. Line items can link to another transaction or another line item in a different account for reconciliation.

| Column                | Type    | Notes                                                      |
|-----------------------|---------|------------------------------------------------------------|
| id                    | INTEGER | Primary key                                                |
| transaction_id        | INTEGER | FK → transactions.id                                      |
| description           | TEXT    | Line description                                           |
| amount                | REAL    | Signed amount for this line                               |
| category              | TEXT    | Our category for this line                                |
| subcategory           | TEXT    | Our subcategory                                            |
| linked_transaction_id | INTEGER | FK → transactions.id (other account); nullable            |
| linked_line_item_id   | INTEGER | FK → line_items.id (other account); nullable               |
| created_at            | [timestamp with time zone*](#dates-and-timestamps) | Display in local TZ in app |
| updated_at            | [timestamp with time zone*](#dates-and-timestamps) | Display in local TZ in app |

**Constraint**: At most one of `linked_transaction_id` or `linked_line_item_id` should be set; both refer to a row in a *different* account. Linking to a line item allows receipt-level reconciliation (e.g., Walmart line item ↔ Capital One transaction).

### Dates and timestamps {#dates-and-timestamps}

*\* = intent is PostgreSQL type; SQLite uses a degraded representation (see below).*

- **created_at / updated_at** (*timestamp with time zone*): In PostgreSQL this is `TIMESTAMPTZ` (timestamp with time zone, fractional seconds). For portability we use a single schema: stored as **epoch seconds with fractional part** (REAL/float), so the app can display in the user’s local time zone (e.g. Mac in San Francisco vs New York) and we keep sub-second accuracy (e.g. milliseconds). In SQLite the column is REAL; in PostgreSQL the column is double precision. Code validates that values are sane when reading/writing.
- **Transaction date** (*date*): **Date only** (no time, no time zone). In PostgreSQL the column type is `DATE`. SQLite has no native DATE type; the column is stored as TEXT in `YYYY-MM-DD` format (SQLite’s standard convention; `date()` and comparisons work correctly). Code validates format and that the value is a valid calendar date.

### Reconciliation Theory

- **Goal**: Summing "unlinked" or "leaf" items (transactions/line items that are not the target of a link) gives a unique list of movements and avoids double-counting.
- **Example**: Ally pays Capital One. We have Transaction A (Ally, outflow) and Transaction B (Capital One, payment). We set A.linked_transaction_id = B (or B.linked_transaction_id = A). When reporting, we treat one side as explained and count the other.
- **Breakdowns**: A Walmart transaction on Capital One might have line items. We might link one line item to another account’s transaction. Items that are linked *to* are "explained" and can be excluded from aggregate sums; the link source is the one we keep for "where did my money go."

## Import Folder Convention

- **Path**: `~/.myknees/backend/imports/` (or repo symlink `packages/backend/imports` → `~/.myknees/backend/imports`).
- **Naming**: Files should start with an account identifier matching `accounts.identifier` (e.g., `Capital_One_2025-07.csv`, `Ally_Bank_export.csv`). This will be used to associate rows with the correct account.
- **Ignore**: Files in `imports/ignore/` are not processed (reference/archived files, e.g. "2025-07 Finance Analysis.xlsx").

## Backups

- **What**: Backups of `imports/` and `data/` under `~/.myknees/backend/backups/`.
- **Schedule**: Daily (e.g. cron at midnight). Run manually with `make backup` (from repo root or backend).
- **Rotation**: Keep last 7 daily backups; then keep 4 weekly; delete older. Implemented in a small Node script invoked by Make/cron.

## Technology

- **Runtime**: Node.js (aligns with ScrapedKnees).
- **DB**: SQLite (local, `~/.myknees/backend/data/`) or PostgreSQL (remote endpoint). Same schema and abstracted data layer; SQL uses a common subset (no DB-specific features in core queries).
- **Abstraction**: All DB access goes through a small repository layer that uses either SQLite or PostgreSQL based on configuration.

## Classification rules (parse formats and categories)

- **parse_formats**: One row per import format (e.g. `ally_bank`, `capital_one`, `costco_receipts`). Each format has a parser (base interface: `normalize(description)` → normalized string); Ally, Capital One, and Costco each have their own implementation (e.g. LC lowercase + regex).
- **classification_categories**: Domain table of final category names (Bills & Utilities, Income, Eating Out, etc.). **Seeded in migration** so the standard categories are part of the codebase.
- **classification_raw_values**: Distinct raw description strings per parse format (from transaction CSVs).
- **classification_normalized**: Cached normalizer output per raw value so changing the parser does not drift existing mappings.
- **classification_mappings**: normalized_value → category_id (FK to classification_categories) per parse format; populated from mapping CSVs (normalized_value, category name).
- **classification_overrides**: Per raw value, optional user override category_id.

Lookup: raw → normalized (cached) → category_id from override if present, else from classification_mappings. Import: run `import-transactions.js` (format + transaction CSV) then `import-mappings.js` (format + mapping CSV); see README.

## Reference: Archived Finance Model

An archived reference spreadsheet (e.g. "2025-07 Finance Analysis.xlsx") built in Google Sheets with AI (e.g. Gemini) classification can be placed in `imports/ignore/` for context. It illustrates:

- Multiple accounts (e.g. Ally, Capital One).
- Transactions with breakdowns and categorization.
- The idea that linked/explained items are excluded from aggregate views so that summing unlinked items gives a single, coherent picture of money flow.

That file is not parsed by the backend; it is for human reference only.
