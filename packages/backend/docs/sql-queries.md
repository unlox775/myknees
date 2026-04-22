# Useful SQL queries (sql console)

**Interactive:** Run `make sql` or `npm run sql`. Type SQL; use multiple lines and end with `;` then Enter. Type `exit` or `quit` to exit.

**CLI (one query, CSV):**  
`node scripts/sql-console.js "SELECT * FROM accounts"`  
`node scripts/sql-console.js "SELECT * FROM transactions LIMIT 10" --out out.csv`

**Debug (DB path, DATA_STORE_ROOT, resolved root, SQLite schema note):**  
`node scripts/sql-console.js "SELECT * FROM accounts" --debug`  
`make add-account IDENTIFIER=Capital_One NAME='Capital One' TYPE=credit_card DEBUG=1`

**If you see 0 rows but you ran add-account and import:** The script prints the DB path at startup. All commands (migrate, add-account, import, sql) must use the **same** database. If your data store was created under a different path, set **DATA_STORE_ROOT** so everything points at the same place (e.g. `export DATA_STORE_ROOT=~/my-data/backend`). Then run `make sql` again; the printed DB path should match where you ran migrate and import. If the DB path is correct but you still see 0 rows, re-run add-account and import-transaction-records from `packages/backend` so data goes into that DB.

## Data model overview

- **accounts** — id, identifier, name, type (bank | credit_card | cash)
- **transactions** — account_id, date, description, amount, category, …
- **line_items** — transaction_id, description, amount, category, …
- **parse_formats** — id, identifier (ally_bank, capital_one, costco_receipts)
- **classification_categories** — id, name (Bills & Utilities, Eating Out, …)
- **classification_raw_values** — parse_format_id, raw_value (distinct descriptions from CSVs)
- **classification_normalized** — raw_value_id, normalized_value (LC output)
- **classification_mappings** — parse_format_id, normalized_value, category_id
- **classification_overrides** — raw_value_id, category_id (optional overrides)

---

## Accounts and transactions

```sql
SELECT * FROM accounts;
```

```sql
SELECT a.identifier, a.name, a.type, COUNT(t.id) AS tx_count
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id;
```

```sql
SELECT id, account_id, date, description, amount, category
FROM transactions
ORDER BY date DESC
LIMIT 20;
```

```sql
SELECT date, COUNT(*) AS cnt, SUM(amount) AS total
FROM transactions
WHERE account_id = 1
GROUP BY date
ORDER BY date DESC
LIMIT 15;
```

---

## Classification (parse formats, categories, mappings)

```sql
SELECT * FROM parse_formats;
```

```sql
SELECT * FROM classification_categories ORDER BY name;
```

```sql
SELECT pf.identifier, COUNT(rv.id) AS raw_count
FROM parse_formats pf
LEFT JOIN classification_raw_values rv ON rv.parse_format_id = pf.id
GROUP BY pf.id;
```

```sql
SELECT pf.identifier, rv.raw_value, n.normalized_value, c.name AS category
FROM classification_raw_values rv
JOIN parse_formats pf ON pf.id = rv.parse_format_id
LEFT JOIN classification_normalized n ON n.raw_value_id = rv.id
LEFT JOIN classification_mappings m ON m.parse_format_id = pf.id AND m.normalized_value = n.normalized_value
LEFT JOIN classification_categories c ON c.id = m.category_id
WHERE pf.identifier = 'ally_bank'
LIMIT 25;
```

```sql
SELECT c.name AS category, COUNT(*) AS cnt
FROM classification_mappings m
JOIN classification_categories c ON c.id = m.category_id
JOIN parse_formats pf ON pf.id = m.parse_format_id
WHERE pf.identifier = 'ally_bank'
GROUP BY c.id
ORDER BY cnt DESC;
```

---

## Normalization health report

Per **parse format** and per **account**: how many distinct raw descriptions **collapse** to the same normalized string (merge buckets), **scrub %** (raw ≠ normalized), merge %, tx-weighted merge %, and sample buckets.

```bash
npm run normalization-report
npm run normalization-report -- --since=2024-01-01
npm run normalization-report -- --since=2023-01-01 --until=2025-12-31
npm run normalization-report -- --from=2024-06-01 --to=2025-06-30
# or: make normalization-report SINCE=2024-01-01
#     make normalization-report FROM=2024-01-01 TO=2025-12-31
```

Creates a **folder** next to the DB, e.g.  
`~/.myknees/backend/data/normalization-reports/YYYY-MM-DD_HH-mm-ss/` containing:

- **`summary.txt`** — legend (scrub vs merge vs txMerge) + one line per format and per account
- **`full-report.txt`** — summary plus concatenated per-format detail
- **`by-format/`** — `ally_bank.txt`, `capital_one.txt`, `costco_receipts.txt` (full detail)
- **`by-account/`** — `<Identifier>.txt` per account with transactions **in scope**

**Date scope (optional):** only transaction rows with `date` in range; only descriptions that appear in that window; **accounts with zero tx in range are omitted** from the summary and `by-account/`. Use **`--since`** (alias **`--after`**) for “on or after”; optional **`--until`** upper bound; or **`--from`** and **`--to`** together (inclusive).

Parent dir override: `node scripts/normalization-report.js --out=/path/to/custom/data`.

After changing parser code in `src/classification/parsers/`, run **`npm run recompute-normalized`** then regenerate the report.

---

## Quick row counts

```sql
SELECT 'accounts' AS tbl, COUNT(*) AS n FROM accounts
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'line_items', COUNT(*) FROM line_items
UNION ALL SELECT 'classification_raw_values', COUNT(*) FROM classification_raw_values
UNION ALL SELECT 'classification_mappings', COUNT(*) FROM classification_mappings;
```
