# MyKnees Backend

Backend data store and financial analysis for MyKnees. Stores accounts, transactions, and line-item breakdowns with cross-account linking for reconciliation.

## Data store (Mac)

On Mac, the data lives under `~/.myknees/backend/` (or set **DATA_STORE_ROOT**, e.g. `~/my-data/backend`, so all commands use the same DB):

- **imports/** — Drop files here (e.g. from ScrapedKnees). File names should start with an account identifier (e.g. `Capital_One_2025-07.csv`).
- **imports/ignore/** — Reference or archived files (e.g. "2025-07 Finance Analysis.xlsx"). Not processed as imports.
- **data/** — SQLite database (`myknees.db`).
- **backups/** — Rotated backups of `imports` and `data`.

Setup (Mac only):

```bash
make data-store   # or: npm run setup
make migrate      # create tables
```

This creates `~/.myknees/backend/` and symlinks `packages/backend/imports`, `data`, and `backups` to it (symlinks are gitignored).

## Non-Mac / remote

Local `~/.myknees` is only used when `HOME` is under `/Users/` (Mac). Otherwise, set a Postgres endpoint:

```bash
export DATA_ENDPOINT="postgresql://user:pass@host:5432/dbname"
make migrate
```

## Commands

| Command | Description |
|--------|-------------|
| `make data-store` | Create `~/.myknees` and symlinks (Mac) |
| `make backup` | Backup imports + data; rotate (7 daily, 4 weekly, monthly forever) |
| `make migrate` | Run DB migrations |
| `make migrate-rollback` | Rollback last migration |
| `make db-reset` | Rollback all + migrate (clean schema) |
| `make add-account IDENTIFIER=Ally_Bank NAME='Ally Bank' TYPE=bank` | Add an account (NAME/TYPE optional) |
| `make xlsx-explore` | List sheets, used range, and formula columns (first .xlsx in imports/ignore) |
| `make xlsx-dump-formulas` | Dump all cell formulas from the XLSX (`SHEET=name` for one sheet) |
| `make xlsx-extract-work-formulas` | Extract pre-scrub + LC from **Work Tables** sheet (Ally, Capital One, Costco) |
| `make xlsx-export` | Export XLSX sheets to CSV (values only). `XLSX_EXPORT_RANGE=A:F` limits columns |
| `make xlsx-export-raw` | One-shot: export Ally bills (A:F), Capital One (A:E), COSTCO Receipts (full) from finance xlsx |
| `make xlsx-import-classification` | Import AI classification sheet into classification tables (env: SOURCE, SHEET, COL_*) |
| `make sql` | Interactive SQL console (history, results truncated at 200 rows) |
| `make check-csv CSV_FILES="f1.csv f2.csv"` | Check CSV(s) for formula-like cells (=...) |

### XLSX → CSV and classification

1. Put the finance XLSX (e.g. "2025-07 Finance Analysis.xlsx") in `~/.myknees/backend/imports/ignore/`.
2. **Explore**: `make xlsx-explore` (or `npm run xlsx:explore`) lists sheets, used range, and which columns have formulas. Writes `{base}-explore-summary.json` next to the xlsx.
3. **Export raw CSV**: `make xlsx-export` exports each sheet to `{base}-{SheetName}.csv` using only cell **values** (no formula strings). To export only columns A–F (raw-only): `XLSX_EXPORT_RANGE=A:F make xlsx-export`.
4. **Check CSVs**: `node scripts/check-csv-no-formulas.js imports/ignore/*.csv` (or `make check-csv CSV_FILES="..."`) to verify no cells start with `=`.
5. **Import classification**: After running migrations (so classification tables exist), set env and run:
   - `SOURCE=ally_bank SHEET="AI classification" COL_DESCRIPTION=A COL_LC=B COL_CATEGORY=E COL_OVERRIDE=D make xlsx-import-classification`
   - Adjust column letters and sheet name to match your spreadsheet. This fills `classification_raw_values`, `classification_normalized` (LC cache), `classification_category_map`, and `classification_overrides`.

## Backups

- **Schedule**: Run daily (e.g. cron: `0 0 * * *` with `cd /path/to/myknees && make backup`).
- **Rotation**: Last 7 daily kept; then 4 weekly (one per week); then one per calendar month kept forever (no purge of monthly).
- Backups are only for local `~/.myknees/backend/`; with `DATA_ENDPOINT`, back up Postgres separately.

## Database

- **SQLite** (default on Mac): `~/.myknees/backend/data/myknees.db`.
- **PostgreSQL**: set `DATA_ENDPOINT`. Same schema; all access goes through repositories.

Schema and design: [docs/architecture.md](docs/architecture.md).

## Classification (parse formats and categories)

- **parse_formats**: Ally Bank, Capital One, Costco Receipts (one parser per format; each implements `normalize(description)` → normalized string).
- **classification_categories**: Domain table of final categories (Bills & Utilities, Income, Eating Out, etc.) **seeded in migration** so they are part of the codebase.
- **classification_raw_values**: Distinct raw descriptions per parse format (from transaction CSVs).
- **classification_normalized**: Cached normalizer output per raw value. After changing parser logic (e.g. aligning with Work Tables), run **`make recompute-normalized`** to refresh all normalized values; fewer distinct values and more will match existing mappings.
- **classification_mappings**: normalized_value → category_id per parse format (from mapping CSVs).
- **classification_overrides**: Optional per-raw-value override category.

### Single-pass transaction import

One command with one CSV does **both** classification and transaction rows: (1) extract distinct descriptions, insert into `classification_raw_values`, run the parser, cache in `classification_normalized`; (2) insert transaction rows into the `transactions` table with **day-by-day** dedupe and **transition-day** merge (see below). There is no separate "classification only" step — run `import:transaction-records` with a transaction CSV and it populates everything needed for that file.

### Import flow (run after migrations)

1. **Import transaction CSVs** (one shot: classification + transaction rows; account must exist):

   ```bash
   npm run import:transaction-records -- --format=ally_bank --account=Ally_Bank "imports/ignore/2025-07 Finance Analysis-2025-07-Ally-bills.csv"
   npm run import:transaction-records -- --format=capital_one --account=Capital_One "imports/ignore/2025-07 Finance Analysis-2025-07-26_CapitalOne.csv"
   npm run import:transaction-records -- --format=costco_receipts --account=Costco "imports/ignore/2025-07 Finance Analysis-COSTCO Receipts.csv"
   ```

2. **Import mapping CSVs** (one file at a time: format, then path; category names must match `classification_categories`):

   ```bash
   npm run import:mappings -- ally_bank imports/ignore/ally_bank-mappings.csv
   npm run import:mappings -- capital_one imports/ignore/capital_one-mappings.csv
   npm run import:mappings -- costco_receipts imports/ignore/costco_receipts-mappings.csv
   ```

### Commands to run (copy-paste)

From `packages/backend` (after `npm run migrate`):

```bash
# 1. Import Ally Bank (classification + transaction rows)
npm run import:transaction-records -- --format=ally_bank --account=Ally_Bank "imports/ignore/2025-07 Finance Analysis-2025-07-Ally-bills.csv"

# 2. Import Capital One
npm run import:transaction-records -- --format=capital_one --account=Capital_One "imports/ignore/2025-07 Finance Analysis-2025-07-26_CapitalOne.csv"

# 3. Import Costco Receipts
npm run import:transaction-records -- --format=costco_receipts --account=Costco "imports/ignore/2025-07 Finance Analysis-COSTCO Receipts.csv"

# 4. Import mapping files (one at a time: format then path)
npm run import:mappings -- ally_bank imports/ignore/ally_bank-mappings.csv
npm run import:mappings -- capital_one imports/ignore/capital_one-mappings.csv
npm run import:mappings -- costco_receipts imports/ignore/costco_receipts-mappings.csv
```

### Transaction-record import (into `transactions` table)

Use `import:transaction-records` when you want to load **transaction rows** (date, description, amount) into the `transactions` table. It enforces:

- **(date, description, amount) is not a unique key**: You can have three McDonald's $10.02 on the same day. Dedupe is **day-by-day**: for each date we compare counts per (description, amount) in the DB vs the file; we insert only the **delta** on days we're allowed to merge.
- **Transition-day rule**: If the import file’s date range **overlaps** existing data for that account, only **transition days** may be amended. The gap size is derived from the import: no missing days → 3; if the import has gaps, gap = longest run of consecutive missing days × 3 (e.g. 10-day gap → 30). A transition day (in the DB) is the first or last day of a contiguous block of data using that gap. Any day with no existing data is always allowed. On transition days, new rows are merged in (day-by-day count delta). On any other day that already has data, that day’s rows from the file are **skipped** (no inserts).
- **New range**: If the file’s date range does **not** overlap any existing dates for that account, all rows are imported.

Example: add the account, then import (from `packages/backend`):

```bash
npm run add-account -- --identifier=Ally_Bank --name="Ally Bank" --type=bank
npm run import:transaction-records -- --format=ally_bank --account=Ally_Bank "imports/ignore/2025-07 Finance Analysis-2025-07-Ally-bills.csv"
```

Or with Make: `make add-account IDENTIFIER=Ally_Bank NAME='Ally Bank' TYPE=bank`

Capital One: the raw export (A:E) has no amount column. For transaction-record import you need a CSV that includes an amount column (e.g. re-export with more columns, or use a different export).

To (re)generate the three mapping CSVs from the AI Classification CSV:

```bash
npm run xlsx:export-mappings -- "imports/ignore/2025-07 Finance Analysis-AI Classification.csv"
```

See [docs/architecture.md](docs/architecture.md) and migrations `20250131000001_*` and `20250131000002_parse_formats_and_categories.js`.

## SQL console

`make sql` (or `npm run sql`) starts an interactive SQL console. **Multi-line:** type SQL until a line ends with `;` then Enter. Command history (up/down); result sets truncated at 200 rows (`SQL_CONSOLE_MAX_ROWS`). Type `exit` or `quit` to exit. On startup the DB path is shown (e.g. `~/.myknees/backend/data/myknees.db`) so you can confirm which DB you're using. **CLI (one-shot, CSV):** `node scripts/sql-console.js "SELECT * FROM accounts"` or `node scripts/sql-console.js "SELECT * FROM accounts" --out results.csv`. See [docs/sql-queries.md](docs/sql-queries.md) for useful queries.

## Reference file

You can place an archived spreadsheet (e.g. "2025-07 Finance Analysis.xlsx") in `~/.myknees/backend/imports/ignore/` for context. Use the xlsx scripts above to export raw CSVs and import classification mappings.
