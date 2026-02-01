# MyKnees Backend - Data store, migrations, backups

.PHONY: help install data-store setup backup migrate migrate-rollback db-reset add-account xlsx-explore xlsx-export xlsx-import-classification sql check-csv

help:
	@echo "Backend commands:"
	@echo "  install         - npm install"
	@echo "  data-store      - Create ~/.myknees and symlinks (Mac only)"
	@echo "  setup           - Alias for data-store"
	@echo "  backup          - Backup imports + data to ~/.myknees/backups (rotate)"
	@echo "  migrate         - Run migrations"
	@echo "  migrate-rollback - Rollback last migration"
	@echo "  db-reset        - Rollback all + migrate (clean schema)"
	@echo "  add-account     - Add an account (IDENTIFIER=Ally_Bank NAME='Ally Bank' TYPE=bank)"
	@echo "  xlsx-explore    - List sheets, used range, formula columns (first .xlsx in imports/ignore)"
	@echo "  xlsx-dump-formulas - Dump all cell formulas (SHEET=name for one sheet)"
	@echo "  xlsx-extract-work-formulas - Extract pre-scrub + LC from Work Tables sheet"
	@echo "  xlsx-export     - Export XLSX sheets to CSV (values only). XLSX_EXPORT_RANGE=A:F to limit columns"
	@echo "  xlsx-export-raw - One-shot: export Ally (A:F), Capital One (A:E), COSTCO (full) from finance xlsx"
	@echo "  xlsx-import-classification - Import AI classification sheet into classification tables (env: SOURCE, SHEET, COL_*)"
	@echo "  sql             - Interactive SQL console (history, truncate at 200 rows)"
	@echo "  import-mappings - Import one mapping CSV (FORMAT=ally_bank MAP_CSV=path)"
	@echo "  recompute-normalized - Recompute all normalized_value from current parser algorithms"
	@echo "  check-csv       - Check CSV(s) for formula-like cells (=...). Pass files as args"

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
	node scripts/add-account.js --identifier=$(IDENTIFIER) $(if $(NAME),--name="$(NAME)") $(if $(TYPE),--type=$(TYPE)) $(if $(DEBUG),--debug)

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

sql:
	node scripts/sql-console.js

check-csv:
	@node scripts/check-csv-no-formulas.js $(CSV_FILES) || true
