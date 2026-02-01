# MyKnees Backend

Backend data store and financial analysis for MyKnees. Stores accounts, transactions, and line-item breakdowns with cross-account linking for reconciliation.

## Data store (Mac)

On Mac, the data lives under `~/.myknees/backend/`:

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
| `make backup` | Backup imports + data; rotate (keep 7 daily, 4 weekly) |
| `make migrate` | Run DB migrations |
| `make migrate-rollback` | Rollback last migration |
| `make db-reset` | Rollback all + migrate (clean schema) |
| `make xlsx-explore` | List sheets, used range, and formula columns (first .xlsx in imports/ignore) |
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
- **Rotation**: Last 7 daily backups kept; then 4 weekly; older ones deleted.
- Backups are only for local `~/.myknees/backend/`; with `DATA_ENDPOINT`, back up Postgres separately.

## Database

- **SQLite** (default on Mac): `~/.myknees/backend/data/myknees.db`.
- **PostgreSQL**: set `DATA_ENDPOINT`. Same schema; all access goes through repositories.

Schema and design: [docs/architecture.md](docs/architecture.md).

## Classification (parse formats and categories)

- **parse_formats**: Ally Bank, Capital One, Costco Receipts (one parser per format; each implements `normalize(description)` → normalized string).
- **classification_categories**: Domain table of final categories (Bills & Utilities, Income, Eating Out, etc.) **seeded in migration** so they are part of the codebase.
- **classification_raw_values**: Distinct raw descriptions per parse format (from transaction CSVs).
- **classification_normalized**: Cached LC (lowercase + regex) output per raw value so changing the parser later does not drift existing mappings.
- **classification_mappings**: normalized_value → category_id per parse format (from mapping CSVs).
- **classification_overrides**: Optional per-raw-value override category.

### Import flow (run after migrations)

1. **Import transaction CSVs** (populates distinct raw values + normalized cache):

   ```bash
   npm run import:transactions -- --format=ally_bank "imports/ignore/2025-07 Finance Analysis-2025-07-Ally-bills.csv"
   npm run import:transactions -- --format=capital_one "imports/ignore/2025-07 Finance Analysis-2025-07-26_CapitalOne.csv"
   npm run import:transactions -- --format=costco_receipts "imports/ignore/2025-07 Finance Analysis-COSTCO Receipts.csv"
   ```

2. **Import mapping CSVs** (normalized_value → category; category names must match `classification_categories`):

   ```bash
   npm run import:mappings -- --format=ally_bank "imports/ignore/ally_bank-mappings.csv" --format=capital_one "imports/ignore/capital_one-mappings.csv" --format=costco_receipts "imports/ignore/costco_receipts-mappings.csv"
   ```

### Commands to run (copy-paste)

From `packages/backend` (after `npm run migrate`):

```bash
# 1. Import Ally Bank (distinct descriptions + LC cache)
npm run import:transactions -- --format=ally_bank "imports/ignore/2025-07 Finance Analysis-2025-07-Ally-bills.csv"

# 2. Import Capital One
npm run import:transactions -- --format=capital_one "imports/ignore/2025-07 Finance Analysis-2025-07-26_CapitalOne.csv"

# 3. Import Costco Receipts
npm run import:transactions -- --format=costco_receipts "imports/ignore/2025-07 Finance Analysis-COSTCO Receipts.csv"

# 4. Import all three mapping files (normalized_value → category)
npm run import:mappings -- --format=ally_bank "imports/ignore/ally_bank-mappings.csv" --format=capital_one "imports/ignore/capital_one-mappings.csv" --format=costco_receipts "imports/ignore/costco_receipts-mappings.csv"
```

To (re)generate the three mapping CSVs from the AI Classification CSV:

```bash
npm run xlsx:export-mappings -- "imports/ignore/2025-07 Finance Analysis-AI Classification.csv"
```

See [docs/architecture.md](docs/architecture.md) and migrations `20250131000001_*` and `20250131000002_parse_formats_and_categories.js`.

## SQL console

`make sql` (or `npm run sql`) starts an interactive SQL console against the configured DB (SQLite or Postgres). It supports command history (up/down) and truncates result sets to 200 rows (configurable via `SQL_CONSOLE_MAX_ROWS`). Type `exit` or `quit` to exit.

## Reference file

You can place an archived spreadsheet (e.g. "2025-07 Finance Analysis.xlsx") in `~/.myknees/backend/imports/ignore/` for context. Use the xlsx scripts above to export raw CSVs and import classification mappings.
