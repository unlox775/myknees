# MyKnees Ad Hoc Browsers (Month Buckets + Category Trends)

This backend-served ad hoc interface area runs from the backend package and serves both pages and `/api` routes from one local process.

## Start Command

From `packages/backend`:

```bash
AD_HOC_PORT=8791 node scripts/ad-hoc-server.js
```

Open either page:

```text
http://127.0.0.1:8791/ad-hoc/month-buckets
http://127.0.0.1:8791/ad-hoc/category-trends
```

If you choose a different host or port, set `AD_HOC_HOST` / `AD_HOC_PORT` and use that URL.

## Page URLs

1. Month-first bucket browser (todo-09)
   - `/ad-hoc/month-buckets`
2. Category-first trend browser (todo-10)
   - `/ad-hoc/category-trends`

## API Endpoints

All endpoints are read-only.

### Month bucket APIs

1. Month bucket summary

```text
GET /api/ad-hoc/month-buckets?year=2026&month=4
```

Returns bucket rows with:
- `bucket`
- `transaction_count`
- `total_amount`
- `detail_path`

2. Bucket transaction detail

```text
GET /api/ad-hoc/month-buckets/:bucket/transactions?year=2026&month=4
```

Returns rows with:
- `transaction_id`
- `date`
- `account_identifier`
- `account_name`
- `amount`
- `bucket`
- `normalized_description`
- `raw_description`

### Category trend APIs

1. Category catalog for a range

```text
GET /api/ad-hoc/category-trends/categories
GET /api/ad-hoc/category-trends/categories?preset=year_to_date
GET /api/ad-hoc/category-trends/categories?start_month=2025-11&end_month=2026-04
```

Returns:
- canonical cutoff metadata (`rule`, earliest/latest month/date, partial-month flag)
- selected range metadata (`start_month`, `end_month`, `month_count`, preset/default metadata)
- `available_months` list for UI selectors
- `categories` list with:
  - `category_key`
  - `category_label`
  - `transaction_count`
  - `total_amount`

2. Monthly trend for one category

```text
GET /api/ad-hoc/category-trends?category=Shopping&start_month=2025-11&end_month=2026-04
```

Returns month rows with:
- `month_key`
- `month_label`
- `is_incomplete_month`
- `transaction_count`
- `total_amount`
- `detail_path`
- `month_bucket_browser_path`

3. Category/month transaction detail

```text
GET /api/ad-hoc/category-trends/:category/months/:month_key/transactions
```

Example:

```text
GET /api/ad-hoc/category-trends/Shopping/months/2026-04/transactions
```

Returns:
- `category`
- `window` (month metadata)
- `transaction_count`
- `total_amount`
- `month_bucket_browser_path`
- detail transaction rows (same fields as month bucket detail API)

## Behavior Notes

- API classification and transfer exclusion follow the same logic used by `scripts/bucket-report.js`.
- Unknown or uncategorized buckets remain visible; the API does not silently merge category labels.
- Category trend default range follows canonical cutoff rule:
  - `last_12_months_ending_latest_transaction_month`
  - if fewer than 12 months exist, the range expands to full available history.
- Category trend responses flag partial latest months when the latest transaction date is before month end.
- Month-bucket page accepts optional query params for category-trend pivots:
  - `/ad-hoc/month-buckets?year=2026&month=4`

## Where To Add Future Ad Hoc Pages

Ad hoc page modules live in:

- `src/ad-hoc/ui-shell.js` (shared navigation/header shell)
- `src/ad-hoc/*-page.js` (page renderers)
- `src/ad-hoc/static/` (page-specific client JS/CSS)
- `scripts/ad-hoc-server.js` (route registration)

To add a new interface:

1. Add a page renderer in `src/ad-hoc/`.
2. Add any static assets in `src/ad-hoc/static/`.
3. Add a nav item in `src/ad-hoc/ui-shell.js`.
4. Register the route and any `/api` endpoints in `scripts/ad-hoc-server.js`.
