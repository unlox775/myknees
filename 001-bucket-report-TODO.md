# 001-bucket-report — TODO

| Item | Status |
|------|--------|
| Wide AI classification CSV → `classification_mappings` (`import-ai-classification-csv.js` + Make target) | done |
| Monthly bucket report with reconciled pairs excluded (`bucket-report.js` + Make target) | done |
| Resolver: overrides, per-format mapping, `chase_visa` → `capital_one` mapping fallback | done |
| Light heuristics for obvious Transfer/Income when still unmapped | done |
| Capital One mapping tail match (sheet `Category / merchant` vs raw card `merchant`) | done |
| Skip `=` formula cells in wide CSV FINAL column | done |
| `project-index.md` myknees entry | done |

Deferred / follow-ups (not in initial scope)

- Fuzzy matching beyond dual key (sheet LC + parser output)
- Costco receipt explosion in bucket report
- Optional: wire `import-mappings.js` to shared `scripts/lib/csv-parse.js`
