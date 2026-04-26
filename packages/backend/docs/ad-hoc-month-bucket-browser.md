# Ad Hoc Month Bucket Browser

This is the first backend-served ad hoc interface for MyKnees. It runs from the backend package and serves both the page and `/api` routes from one local process.

## Start Command

From `packages/backend`:

```bash
AD_HOC_PORT=8791 node scripts/ad-hoc-server.js
```

Then open:

```text
http://127.0.0.1:8791/ad-hoc/month-buckets
```

If you choose a different host or port, set `AD_HOC_HOST` / `AD_HOC_PORT` and use that URL.

## API Endpoints

All endpoints are read-only.

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

Month defaults to the current runtime month/year when `year` and `month` are omitted.

## Behavior Notes

- API classification and transfer exclusion follow the same logic used by `scripts/bucket-report.js`.
- The summary includes all buckets found in the selected month, including `Undefined` when unmapped rows exist.
- The detail table shows normalized descriptions and exposes raw descriptions on hover.

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
4. Register a route in `scripts/ad-hoc-server.js`.
