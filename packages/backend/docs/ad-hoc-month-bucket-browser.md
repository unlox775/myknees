# MyKnees Ad Hoc Browsers (Month Buckets + Category Trends + Projection APIs + Six-Month Scenario + Recurring Review)

This backend-served ad hoc interface area runs from the backend package and serves both pages and `/api` routes from one local process.

## Start Command

From `packages/backend`:

```bash
AD_HOC_PORT=8791 node scripts/ad-hoc-server.js
```

Open pages:

```text
http://127.0.0.1:8791/ad-hoc/month-buckets
http://127.0.0.1:8791/ad-hoc/category-trends
http://127.0.0.1:8791/ad-hoc/projection-forecast
http://127.0.0.1:8791/ad-hoc/projection-scenario
http://127.0.0.1:8791/ad-hoc/recurring-review
```

If you choose a different host or port, set `AD_HOC_HOST` / `AD_HOC_PORT` and use that URL.

## Page URLs

1. Month-first bucket browser (todo-09)
   - `/ad-hoc/month-buckets`
2. Category-first trend browser (todo-10)
   - `/ad-hoc/category-trends`
3. Projection profiles + forecast browser (todo-11 foundation)
   - `/ad-hoc/projection-forecast`
4. Six-month projection scenario interface (todo-12)
   - `/ad-hoc/projection-scenario`
5. Recurring review + subscription waste detector (todo-13)
   - `/ad-hoc/recurring-review`

## API Endpoints

Most endpoints are read-only. Projection profile updates and scenario forecast requests use POST.

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

### Projection profile + forecast APIs

The forecast API follows one sign convention everywhere:
- income rows are positive values
- expense rows are negative values
- paused profiles can emit zero-amount informational rows (`row_type=paused_profile_notice`)

1. List projection profiles (seeded + editable assumptions)

```text
GET /api/ad-hoc/projections/profiles?account=Ally_Bank
```

Returns:
- `profiles[]` with pattern, amount logic, cadence, pause/resume settings, confidence, source note
- `override_fields[]` so todo-12 UI can show only supported edits

2. Update one profile (write-light; projection tables only)

```text
POST /api/ad-hoc/projections/profiles/:profile_key
Content-Type: application/json
```

Example payload:

```json
{
  "amount_value": 1300,
  "resume_date": "2026-09-01",
  "assumption_note": "resume after reserve buffer reaches target"
}
```

3. List account balance anchors

```text
GET /api/ad-hoc/projections/anchors?account=Ally_Bank
```

Returns:
- anchor rows including canonical April 2026 Ally supervisor anchor

4. List inferred recurring candidates (history-derived, confidence-labeled)

```text
GET /api/ad-hoc/projections/inferred-candidates?account=Ally_Bank
```

5. Refresh inferred recurring candidates from transaction history

```text
POST /api/ad-hoc/projections/inferred-candidates/refresh?account=Ally_Bank
```

6. Generate forecast rows (defaults only)

```text
GET /api/ad-hoc/projections/forecast?account=Ally_Bank&start_month=2026-04&months=6
```

Returns:
- `anchor` used for running balance start
- `rows[]` with date, profile id/key/name, signed amount, running balance, source note, confidence
- `month_totals[]` and `totals` summaries
- `assumptions[]` list for explainability (profile → source mapping)

7. Category monthly defaults from recent actuals (expense categories)

```text
GET /api/ad-hoc/projections/category-defaults?account=Ally_Bank&forecast_start_month=2026-04&lookback_months=3
```

Returns:
- `category_window` with canonical start/end months used for defaults
- `categories[]` with `category`, `default_monthly_amount`, and signed month totals

8. Generate forecast rows with scenario overrides

```text
POST /api/ad-hoc/projections/forecast?account=Ally_Bank&start_month=2026-04&months=6
Content-Type: application/json
```

Example payload:

```json
{
  "scenario_overrides": {
    "warning_balance_threshold": 500,
    "anchor_balance_override": 1919.76,
    "profile_overrides": {
      "double_oven_event_2026_05_15": {
        "amount_value": 2300,
        "start_date": "2026-05-20"
      },
      "family_vacation_event_2026_07_01": {
        "amount_value": 1800
      },
      "parent_plus_monthly_start_2026_06": {
        "amount_value": 100,
        "start_date": "2026-06-01"
      },
      "edward_jones_paused_2026-04-01_52500": {
        "resume_date": "2026-09-01",
        "amount_value": 525
      }
    },
    "category_overrides": {
      "Bills & Utilities": 1200,
      "Shopping": 350
    },
    "category_default_window": {
      "start_month": "2026-01",
      "end_month": "2026-03"
    }
  }
}
```

Response adds:
- `effective_anchor_balance`
- `scenario_answer` (survival, lowest balance, warning-threshold row counts)
- `applied_overrides` (which profile/category overrides were used)

### Recurring review + subscription detector APIs

1. List recurring/subscription candidates

```text
GET /api/ad-hoc/recurring-review/candidates?accounts=Ally_Bank,Capital_One,Chase_VISA
GET /api/ad-hoc/recurring-review/candidates?accounts=all&sort=monthly_equivalent_desc&label=discretionary
```

Returns:
- `canonical_window` with one canonical cutoff date and 24-month default window metadata
- `detection_criteria` with cadence thresholds used for classification
- `totals` with candidate counts and aggregate monthly/annual equivalent totals
- `candidates[]` with:
  - `candidate_id`, `display_name`, `normalized_key`
  - `account_identifiers`, `category`, `category_distribution`
  - `cadence` (`monthly`, `every-other-month`, `annual`, `low-confidence`)
  - `confidence` label + score
  - `essentiality` (`essential`, `discretionary`, `unknown`)
  - `monthly_equivalent` and `annual_equivalent`
  - `history[]` month buckets for inline graph rendering
  - `detail_path` for drilldown transactions

2. Candidate drilldown transactions

```text
GET /api/ad-hoc/recurring-review/candidates/:candidate_id/transactions?accounts=Ally_Bank,Capital_One,Chase_VISA
```

Returns:
- candidate summary metadata
- `transactions[]` rows with date, account, amount, category, raw description, normalized description, and tx id

#### Detection thresholds used for todo-13

- Canonical analysis window: last 24 months ending at latest transaction date for selected accounts.
- Monthly candidate:
  - at least 3 active months
  - dominant month spacing 1
  - spacing regularity >= 0.45
  - average transactions per active month <= 2.2
- Every-other-month candidate:
  - at least 3 active months
  - dominant month spacing 2
  - spacing regularity >= 0.45
  - average transactions per active month <= 2.2
- Annual candidate:
  - at least 2 active months
  - dominant spacing in the 10-14 month range
  - spacing regularity >= 0.50
  - span >= 11 months
  - average transactions per active month <= 1.4
- Low-confidence pattern:
  - at least 4 active months
  - spacing regularity >= 0.35
  - amount coefficient of variation <= 0.95
  - average transactions per active month <= 1.8
- Additional confidence guardrail:
  - annual two-point matches that are neither essential nor subscription-like are forced to low confidence to reduce false-positive cancellation suggestions.

#### Savings math shown in the recurring review UI

- Default state: every candidate starts as kept/checked.
- Annual equivalent estimate:
  - `median(active-month total) * (12 / cadence_interval_months)`
- Monthly equivalent estimate:
  - `annual_equivalent / 12`
- Potential savings totals:
  - sum of monthly/annual equivalents for currently unchecked candidates.
- Savings totals are hypothetical planning values and should be interpreted with essential/discretionary/unknown labels.

## Behavior Notes

- API classification and transfer exclusion follow the same logic used by `scripts/bucket-report.js`.
- Unknown or uncategorized buckets remain visible; the API does not silently merge category labels.
- Category trend default range follows canonical cutoff rule:
  - `last_12_months_ending_latest_transaction_month`
  - if fewer than 12 months exist, the range expands to full available history.
- Category trend responses flag partial latest months when the latest transaction date is before month end.
- Month-bucket page accepts optional query params for category-trend pivots:
  - `/ad-hoc/month-buckets?year=2026&month=4`
- Recurring review exposes label-aware sorting/filtering for fast triage:
  - `sort=confidence_desc|monthly_equivalent_desc|annual_equivalent_desc|subscriptions_first|annual_first|essential_first`
  - `label=essential|discretionary|unknown|subscription|annual|every-other-month|low-confidence`
- Projection seed facts included by default for `Ally_Bank`:
  - April 2026 anchor (`$1,919.76` after first April transaction)
  - Parent PLUS (`$100/month` from `2026-06-01`)
  - Double oven (`$2,500` around `2026-05-15`)
  - Family vacation (`$2,000` around `2026-07-01`)
  - Edward Jones paused transfer templates inferred from historical debits
  - paycheck-linked tithing/fast-offering logic with explicit source notes
- Six-month scenario page local storage:
  - key: `myknees.ad_hoc.projection_scenario_inputs.v1`
  - stores scenario inputs only (no raw transactions)
  - reset behavior: click `Reset Local Overrides` to clear overrides and return to backend defaults
- Scenario blank override rule:
  - blank field means backend default remains active
  - non-blank field is validated and applied in the forecast request
  - invalid fields block recalculation and show explicit errors

## Known Limitations

- Scenario overrides are browser-local and are not persisted to projection profile tables.
- Category overrides apply monthly delta rows (`category_override_adjustment`) rather than rewriting base profile definitions.
- Six-month scenario UI is ad hoc and does not support named scenarios or multi-user state.

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
