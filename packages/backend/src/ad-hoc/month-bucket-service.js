const { getParser } = require('../classification');
const {
  loadCategoryMaps,
  loadOverrides,
  loadRuleOverrides,
  resolveTransactionCategory,
} = require('../classification/resolve-transaction-category');
const { resolveFormatIdentifier } = require('../reconciliation/resolve-format');

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const DEFAULT_FORMAT_FILTER = ['ally_bank', 'capital_one', 'chase_visa'];

function parseMonthToken(token) {
  if (token == null || token === '') return null;

  const numeric = parseInt(String(token).trim(), 10);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }

  const lower = String(token).trim().toLowerCase();
  const exactIdx = MONTH_NAMES.indexOf(lower);
  if (exactIdx >= 0) return exactIdx + 1;

  if (lower.length >= 3) {
    const abbrIdx = MONTH_NAMES.findIndex((name) => name.startsWith(lower));
    if (abbrIdx >= 0) return abbrIdx + 1;
  }

  throw new Error(`Invalid month value: ${token}`);
}

function lastDayOfMonth(year, month) {
  const d = new Date(Date.UTC(year, month, 0));
  const day = d.getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function resolveMonthWindow(searchParams) {
  const now = new Date();
  const rawYear = searchParams.get('year');
  const rawMonth = searchParams.get('month');

  const year = rawYear == null || rawYear === '' ? now.getFullYear() : parseInt(String(rawYear).trim(), 10);
  if (!Number.isInteger(year) || year < 1970 || year > 3000) {
    throw new Error(`Invalid year value: ${rawYear}`);
  }

  const month = rawMonth == null || rawMonth === '' ? now.getMonth() + 1 : parseMonthToken(rawMonth);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month value: ${rawMonth}`);
  }

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to = lastDayOfMonth(year, month);

  return {
    year,
    month,
    from,
    to,
    label: `${from} … ${to}`,
  };
}

function buildDetailPath(bucket, year, month) {
  return `/api/ad-hoc/month-buckets/${encodeURIComponent(bucket)}/transactions?year=${year}&month=${month}`;
}

function amountNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num;
}

async function fetchMonthBucketData(knex, monthWindow, options = {}) {
  const includeLinked = Boolean(options.includeLinked);
  const formatFilter = Array.isArray(options.formatFilter)
    ? options.formatFilter
    : DEFAULT_FORMAT_FILTER;

  const linkedTargets = await knex('transactions')
    .whereNotNull('linked_transaction_id')
    .pluck('linked_transaction_id');
  const linkedSet = new Set(
    (linkedTargets || []).filter((value) => value != null)
  );

  let query = knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .leftJoin('parse_formats', 'parse_formats.id', 'accounts.parse_format_id')
    .leftJoin('one_time_events', 'one_time_events.id', 'transactions.one_time_event_id')
    .whereBetween('transactions.date', [monthWindow.from, monthWindow.to])
    .select(
      'transactions.id',
      'transactions.account_id',
      'transactions.date',
      'transactions.description',
      'transactions.amount',
      'transactions.category',
      'transactions.notes',
      'transactions.category_source',
      'transactions.one_time_event_id',
      'transactions.linked_transaction_id',
      'accounts.identifier as account_identifier',
      'accounts.name as account_name',
      'parse_formats.identifier as parse_format_identifier',
      'one_time_events.event_key as one_time_event_key',
      'one_time_events.display_name as one_time_event_display_name',
      'one_time_events.event_year as one_time_event_year',
      'one_time_events.status as one_time_event_status'
    )
    .orderBy('transactions.date', 'asc')
    .orderBy('transactions.id', 'asc');

  if (!includeLinked) {
    query = query.whereNull('transactions.linked_transaction_id');
    if (linkedSet.size > 0) {
      query = query.whereNotIn('transactions.id', [...linkedSet]);
    }
  }

  const baseRows = await query;
  const categoryMap = await loadCategoryMaps(knex);
  const overrideMap = await loadOverrides(knex);
  const ruleOverrideMap = await loadRuleOverrides(knex);

  const domainOrder = (
    await knex('classification_categories').select('name').orderBy('id', 'asc')
  ).map((row) => row.name);

  const accountFormatCache = new Map();
  const transactions = [];
  let skippedByFormat = 0;

  for (const row of baseRows) {
    let formatId = row.parse_format_identifier;
    if (!formatId) {
      if (accountFormatCache.has(row.account_id)) {
        formatId = accountFormatCache.get(row.account_id);
      } else {
        formatId = await resolveFormatIdentifier(knex, row.account_id);
        accountFormatCache.set(row.account_id, formatId);
      }
    }

    if (
      Array.isArray(formatFilter) &&
      formatFilter.length > 0 &&
      !formatFilter.includes(formatId)
    ) {
      skippedByFormat += 1;
      continue;
    }

    const rawDescription = row.description || '';
    const parser = getParser(formatId);
    const normalizedDescription = parser
      ? parser.normalize(rawDescription)
      : rawDescription.trim().toLowerCase();

    const ruleResolved = resolveTransactionCategory(
      formatId,
      rawDescription,
      normalizedDescription,
      overrideMap,
      categoryMap,
      ruleOverrideMap
    );
    const hasManualOverride = row.category_source === 'manual_override' && row.category;
    const effectiveCategory = hasManualOverride ? row.category : ruleResolved.category;
    const effectiveOneTimeEventId = hasManualOverride
      ? row.one_time_event_id || null
      : ruleResolved.one_time_event_id || row.one_time_event_id || null;

    transactions.push({
      transaction_id: row.id,
      account_id: row.account_id,
      account_identifier: row.account_identifier,
      account_name: row.account_name,
      date: row.date,
      amount: amountNumber(row.amount),
      bucket: effectiveCategory,
      effective_category: effectiveCategory,
      default_rule_category: ruleResolved.category,
      category_source: hasManualOverride ? 'manual_override' : 'rule_based',
      rule_source: ruleResolved.source,
      one_time_event_id: effectiveOneTimeEventId,
      one_time_event_key: hasManualOverride ? row.one_time_event_key || null : ruleResolved.one_time_event_key || row.one_time_event_key || null,
      one_time_event_display_name: hasManualOverride ? row.one_time_event_display_name || null : ruleResolved.one_time_event_display_name || row.one_time_event_display_name || null,
      one_time_event_year: hasManualOverride ? row.one_time_event_year || null : ruleResolved.one_time_event_year || row.one_time_event_year || null,
      one_time_event_status: hasManualOverride ? row.one_time_event_status || null : ruleResolved.one_time_event_status || row.one_time_event_status || null,
      normalized_description: normalizedDescription,
      raw_description: rawDescription,
      notes: row.notes || '',
    });
  }

  const aggregateByBucket = new Map();
  let totalAmount = 0;

  for (const row of transactions) {
    if (!aggregateByBucket.has(row.bucket)) {
      aggregateByBucket.set(row.bucket, {
        transaction_count: 0,
        total_amount: 0,
      });
    }

    const agg = aggregateByBucket.get(row.bucket);
    agg.transaction_count += 1;
    agg.total_amount += row.amount;
    totalAmount += row.amount;
  }

  const orderedBucketNames = [
    ...domainOrder.filter((name) => aggregateByBucket.has(name)),
    ...[...aggregateByBucket.keys()]
      .filter((name) => !domainOrder.includes(name))
      .sort((a, b) => a.localeCompare(b)),
  ];

  const buckets = orderedBucketNames.map((bucket) => {
    const agg = aggregateByBucket.get(bucket);
    return {
      bucket,
      transaction_count: agg.transaction_count,
      total_amount: Number(agg.total_amount.toFixed(2)),
      detail_path: buildDetailPath(bucket, monthWindow.year, monthWindow.month),
    };
  });

  return {
    window: monthWindow,
    include_linked: includeLinked,
    format_filter: formatFilter,
    scanned_transaction_count: baseRows.length,
    skipped_by_format: skippedByFormat,
    linked_target_count: linkedSet.size,
    totals: {
      bucket_count: buckets.length,
      transaction_count: transactions.length,
      total_amount: Number(totalAmount.toFixed(2)),
    },
    buckets,
    transactions,
  };
}

function getBucketDetails(report, bucket) {
  const matching = report.transactions.filter((row) => row.bucket === bucket);
  const totalAmount = matching.reduce((sum, row) => sum + row.amount, 0);

  return {
    bucket,
    transaction_count: matching.length,
    total_amount: Number(totalAmount.toFixed(2)),
    transactions: matching,
  };
}

module.exports = {
  DEFAULT_FORMAT_FILTER,
  resolveMonthWindow,
  fetchMonthBucketData,
  getBucketDetails,
};
