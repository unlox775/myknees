# MyKnees Backend - Data store, migrations, backups

.PHONY: help install data-store setup backup migrate migrate-rollback db-reset add-account set-account-parse-format xlsx-explore xlsx-export xlsx-import-classification sql check-csv normalization-report classification-report list-transactions low-hanging-fruit-report bucket-report import-ai-classification-csv plaid-link plaid-sync

help:
	@echo "Backend commands:"
	@echo "  install         - npm install"
	@echo "  data-store      - Create ~/.myknees and symlinks (Mac only)"
	@echo "  setup           - Alias for data-store"
	@echo "  backup          - Backup imports + data to ~/.myknees/backups (rotate)"
	@echo "  migrate         - Run migrations"
	@echo "  migrate-rollback - Rollback last migration"
	@echo "  db-reset        - Rollback all + migrate (clean schema)"
	@echo "  add-account     - Add an account (IDENTIFIER=… NAME=… TYPE=… PARSE_FORMAT=chase_visa optional)"
	@echo "  set-account-parse-format - Pin normalizer + seed classification (ACCOUNT=… PARSE_FORMAT=…)"
	@echo "  xlsx-explore    - List sheets, used range, formula columns (first .xlsx in imports/ignore)"
	@echo "  xlsx-dump-formulas - Dump all cell formulas (SHEET=name for one sheet)"
	@echo "  xlsx-extract-work-formulas - Extract pre-scrub + LC from Work Tables sheet"
	@echo "  xlsx-export     - Export XLSX sheets to CSV (values only). XLSX_EXPORT_RANGE=A:F to limit columns"
	@echo "  xlsx-export-raw - One-shot: export Ally (A:F), Capital One (A:E), COSTCO (full) from finance xlsx"
	@echo "  xlsx-import-classification - Import AI classification sheet into classification tables (env: SOURCE, SHEET, COL_*)"
	@echo "  sql             - Interactive SQL console (history, truncate at 200 rows)"
	@echo "  import-mappings - Import one mapping CSV (FORMAT=ally_bank MAP_CSV=path)"
	@echo "  recompute-normalized - Recompute all normalized_value from current parser algorithms"
	@echo "  normalization-report - Health stats → data/normalization-reports/<stamp>/ (opt: SINCE= UNTIL= FROM= TO=)"
	@echo "  classification-report - Mapping coverage % → data/classification-reports/<stamp>/ (same date args as normalization-report)"
	@echo "  list-transactions - One account to stdout: table (default) or FORMAT=csv (ACCOUNT= FROM=/TO= or SINCE=/UNTIL=; pipe: | less -S)"
	@echo "  low-hanging-fruit-report - Similar raws → data/low-hanging-fruit-reports/<stamp>/ (omit ACCOUNTS → all DB accounts; or ACCOUNTS=id1,id2 / ACCOUNTS=all; FROM=/TO= optional)"
	@echo "  import-ai-classification-csv - Wide AI Classification CSV → classification_mappings (CSV=path)"
	@echo "  bucket-report - Totals by category for a month (YEAR=2026 MONTH=1|January; optional FROM=/TO=, ACCOUNTS=, FORMATS=)"
	@echo "  check-csv       - Check CSV(s) for formula-like cells (=...). Pass files as args"
	@echo "  plaid-link      - Local Plaid Link UI → secrets/plaid-items.json (needs PLAID_CLIENT_ID/SECRET)"
	@echo "  plaid-sync      - transactions/sync → imports/ CSV + import-transaction-records (map secrets/plaid-account-map.json)"
	@echo ""
	@echo "Examples (low-hanging-fruit):"
	@echo "  make low-hanging-fruit-report FROM=2015-01-01 TO=2023-01-01"
	@echo "  make low-hanging-fruit-report FROM=2015-01-01 TO=2023-01-01 ACCOUNTS=Chase_VISA"
	@echo "  make low-hanging-fruit-report ACCOUNTS=all"

install:
	npm install

data-store: setup
setup:
	node scripts/setup-data-store.js

backup:
	node scripts/backup.js

migrate: setup-if-mac
	npx knex migrate:latest

# Ensure ~/.myknees/backend exists before migrate (Mac only; no-op if not Mac)
setup-if-mac:
	@node -e "const h = process.env.HOME || ''; if (h.startsWith('/Users/')) { const p = require('path'), fs = require('fs'); const root = p.join(h, '.myknees', 'backend'); [root, p.join(root,'data')].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }); }"

migrate-rollback:
	npx knex migrate:rollback

db-reset:
	node scripts/reset-db.js

# Add account (IDENTIFIER=Ally_Bank NAME='Ally Bank' TYPE=bank). NAME/TYPE optional. DEBUG=1 adds --debug.
add-account:
	node scripts/add-account.js --identifier=$(IDENTIFIER) $(if $(NAME),--name="$(NAME)") $(if $(TYPE),--type=$(TYPE)) $(if $(PARSE_FORMAT),--parse-format=$(PARSE_FORMAT),) $(if $(DEBUG),--debug)

# Pin account to a parse_formats row and upsert classification for all distinct descriptions on that account.
set-account-parse-format:
	node scripts/set-account-parse-format.js --account=$(ACCOUNT) --parse-format=$(PARSE_FORMAT)

xlsx-explore:
	node scripts/xlsx-explore.js $(XLSX_PATH)

xlsx-dump-formulas:
	node scripts/xlsx-dump-formulas.js $(XLSX_PATH)

xlsx-extract-work-formulas:
	node scripts/xlsx-extract-work-table-formulas.js $(XLSX_PATH)

xlsx-export:
	node scripts/export-xlsx-to-csv.js $(XLSX_PATH)

xlsx-export-raw:
	node scripts/export-finance-raw.js $(XLSX_PATH)

xlsx-import-classification:
	node scripts/import-classification-from-xlsx.js $(XLSX_PATH)

xlsx-export-mappings:
	node scripts/export-classification-mappings.js $(AI_CLASSIFICATION_CSV)

# Single-pass import: classification + transaction rows (FORMAT=ally_bank|capital_one|costco_receipts, ACCOUNT=identifier, CSV=path)
import-transaction-records:
	node scripts/import-transaction-records.js --format=$(FORMAT) --account=$(ACCOUNT) $(CSV)

# Import one mapping CSV: FORMAT=ally_bank|capital_one|costco_receipts, MAP_CSV=path
import-mappings:
	node scripts/import-mappings.js $(FORMAT) $(MAP_CSV)

# Recompute all classification_normalized from current parsers (e.g. after aligning with Work Tables)
recompute-normalized:
	node scripts/recompute-normalized.js

normalization-report:
	node scripts/normalization-report.js $(if $(SINCE),--since=$(SINCE),) $(if $(UNTIL),--until=$(UNTIL),) $(if $(FROM),--from=$(FROM),) $(if $(TO),--to=$(TO),) $(if $(OUT),--out=$(OUT),)

classification-report:
	node scripts/classification-report.js $(if $(SINCE),--since=$(SINCE),) $(if $(UNTIL),--until=$(UNTIL),) $(if $(FROM),--from=$(FROM),) $(if $(TO),--to=$(TO),) $(if $(OUT),--out=$(OUT),)

# ACCOUNT= required. Optional FROM=/TO= or SINCE=/UNTIL=. FORMAT=csv for CSV; default text table.
list-transactions:
	@if [ -z "$(ACCOUNT)" ]; then echo "Set ACCOUNT=Capital_One (or other identifier)"; exit 1; fi
	node scripts/list-transactions.js --account="$(ACCOUNT)" \
	  $(if $(FROM),--from=$(FROM),) $(if $(TO),--to=$(TO),) \
	  $(if $(SINCE),--since=$(SINCE),) $(if $(UNTIL),--until=$(UNTIL),) \
	  $(if $(FORMAT),--format=$(FORMAT),)

# Similar merchant strings likely to merge. Omit ACCOUNTS → every account in the DB.
# ACCOUNTS=id1,id2 or ACCOUNTS=all. Optional: FROM= TO= or SINCE= UNTIL=, MIN_SCORE=0.78, TOP_CLUSTERS=40, TOP_PAIRS=50, OUT=parent dir
# INCLUDE_SAME_NORM=true — also list similar strings that already share one normalized label (e.g. case dupes).
low-hanging-fruit-report:
	node scripts/low-hanging-fruit-report.js \
	  $(if $(FROM),--from=$(FROM),) $(if $(TO),--to=$(TO),) \
	  $(if $(SINCE),--since=$(SINCE),) $(if $(UNTIL),--until=$(UNTIL),) \
	  $(if $(ACCOUNTS),--accounts=$(ACCOUNTS),) \
	  $(if $(MIN_SCORE),--min-score=$(MIN_SCORE),) \
	  $(if $(TOP_CLUSTERS),--top-clusters=$(TOP_CLUSTERS),) \
	  $(if $(TOP_PAIRS),--top-pairs=$(TOP_PAIRS),) \
	  $(if $(INCLUDE_SAME_NORM),--include-same-norm=$(INCLUDE_SAME_NORM),) \
	  $(if $(OUT),--out=$(OUT),)

# Wide sheet export (Ally | Capital One | Costco columns). CSV=path/to.csv
import-ai-classification-csv:
	@if [ -z "$(CSV)" ]; then echo "Set CSV=/path/to/Finance Analysis - AI Classification.csv"; exit 1; fi
	node scripts/import-ai-classification-csv.js "$(CSV)"

# YEAR + MONTH (number or name), or FROM= and TO= together. Optional ACCOUNTS=Id1,Id2 FORMATS=ally_bank,capital_one,chase_visa
bucket-report:
	@if [ -n "$(FROM)" ] && [ -n "$(TO)" ]; then \
	  ACCOUNTS="$(ACCOUNTS)" FORMATS="$(FORMATS)" node scripts/bucket-report.js --from="$(FROM)" --to="$(TO)" \
	    $(if $(OUT),--out=$(OUT),) $(if $(INCLUDE_LINKED),--include-linked,); \
	elif [ -n "$(YEAR)" ] && [ -n "$(MONTH)" ]; then \
	  ACCOUNTS="$(ACCOUNTS)" FORMATS="$(FORMATS)" node scripts/bucket-report.js --year="$(YEAR)" --month="$(MONTH)" \
	    $(if $(OUT),--out=$(OUT),) $(if $(INCLUDE_LINKED),--include-linked,); \
	else \
	  echo "Set YEAR=2026 MONTH=1 (or January) or both FROM=YYYY-MM-DD and TO=YYYY-MM-DD"; exit 1; \
	fi

sql:
	node scripts/sql-console.js

check-csv:
	@node scripts/check-csv-no-formulas.js $(CSV_FILES) || true

plaid-link:
	node scripts/plaid/link-local-server.js

plaid-sync:
	node scripts/plaid/sync-to-imports.js
