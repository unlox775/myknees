const {
  DEFAULT_FORMAT_FILTER,
  fetchMonthBucketData,
} = require('./month-bucket-service');
const { getParser } = require('../classification');
const {
  loadCategoryMaps,
  loadOverrides,
  loadRuleOverrides,
  resolveTransactionCategory,
} = require('../classification/resolve-transaction-category');
const { resolveFormatIdentifier } = require('../reconciliation/resolve-format');
const { listRecurringSeriesTransactionSpans } = require('./recurring-review-service');

function parseMonthKey(value) {
  const token = String(value || '').trim();
  const match = token.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error(`Invalid month key: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || year < 1970 || year > 3000 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${value}`);
  }
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
}

function monthKeyFromDate(dateValue) {
  const token = String(dateValue || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(token)) throw new Error(`Invalid date value: ${dateValue}`);
  return token.slice(0, 7);
}

function lastDayOfMonth(year, month) {
  const d = new Date(Date.UTC(year, month, 0));
  return `${year}-${String(month).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function shiftMonthKey(monthKey, delta) {
  let { year, month } = parseMonthKey(monthKey);
  let remaining = Number(delta) || 0;
  while (remaining > 0) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    remaining -= 1;
  }
  while (remaining < 0) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    remaining += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function enumerateDays(fromDate, toDate) {
  const days = [];
  const cursor = new Date(`${fromDate}T12:00:00.000Z`);
  const end = new Date(`${toDate}T12:00:00.000Z`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (days.length > 370) throw new Error('Spread graph date range is too large.');
  }
  return days;
}

function addDays(dateValue, deltaDays) {
  const d = new Date(`${dateValue}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + Number(deltaDays || 0));
  return d.toISOString().slice(0, 10);
}

async function latestTransactionDate(knex) {
  const row = await knex('transactions').max({ max_date: 'date' }).first();
  return row && row.max_date ? row.max_date : null;
}

async function fetchJanuarySortTotals(knex, endMonth) {
  const end = parseMonthKey(endMonth);
  const januaryYear = end.month <= 2 ? end.year - 1 : end.year;
  const report = await fetchTransactionsForRange(knex, `${januaryYear}-01-01`, `${januaryYear}-01-31`);
  const totals = {};
  for (const tx of report) {
    totals[tx.category] = (totals[tx.category] || 0) + Math.abs(Number(tx.amount) || 0);
  }
  return {
    sort_month: `${januaryYear}-01`,
    totals,
  };
}

async function fetchTransactionsForRange(knex, from, to) {
  const categoryMap = await loadCategoryMaps(knex);
  const overrideMap = await loadOverrides(knex);
  const ruleOverrideMap = await loadRuleOverrides(knex);
  const accountFormatCache = new Map();
  const rows = await knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .leftJoin('parse_formats', 'parse_formats.id', 'accounts.parse_format_id')
    .whereBetween('transactions.date', [from, to])
    .whereNull('transactions.linked_transaction_id')
    .select(
      'transactions.id',
      'transactions.account_id',
      'transactions.date',
      'transactions.description',
      'transactions.amount',
      'transactions.category',
      'transactions.category_source',
      'accounts.identifier as account_identifier',
      'parse_formats.identifier as parse_format_identifier'
    )
    .orderBy('transactions.date', 'asc')
    .orderBy('transactions.id', 'asc');

  const result = [];
  for (const row of rows) {
    let formatId = row.parse_format_identifier;
    if (!formatId) {
      if (accountFormatCache.has(row.account_id)) {
        formatId = accountFormatCache.get(row.account_id);
      } else {
        formatId = await resolveFormatIdentifier(knex, row.account_id);
        accountFormatCache.set(row.account_id, formatId);
      }
    }
    if (DEFAULT_FORMAT_FILTER.length && !DEFAULT_FORMAT_FILTER.includes(formatId)) continue;

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
    const category = hasManualOverride ? row.category : ruleResolved.category;
    result.push({
      transaction_id: row.id,
      date: row.date,
      amount: Number(row.amount) || 0,
      category,
      account_identifier: row.account_identifier,
      normalized_description: normalizedDescription,
      raw_description: rawDescription,
    });
  }
  return result;
}

async function fetchBudgetDefaults(knex, endMonth) {
  const monthKeys = [shiftMonthKey(endMonth, -3), shiftMonthKey(endMonth, -2), shiftMonthKey(endMonth, -1)];
  const totals = new Map();
  for (const monthKey of monthKeys) {
    const parsed = parseMonthKey(monthKey);
    const monthFrom = `${monthKey}-01`;
    const monthTo = lastDayOfMonth(parsed.year, parsed.month);
    const report = await fetchMonthBucketData(knex, {
      year: parsed.year,
      month: parsed.month,
      from: monthFrom,
      to: monthTo,
      label: `${monthFrom} … ${monthTo}`,
    }, { includeLinked: false, formatFilter: DEFAULT_FORMAT_FILTER });

    for (const bucket of report.buckets) {
      totals.set(bucket.bucket, (totals.get(bucket.bucket) || 0) + (Number(bucket.total_amount) || 0));
    }
  }

  const byCategory = {};
  for (const [category, signedTotal] of totals.entries()) {
    const average = signedTotal / monthKeys.length;
    if (average < 0) byCategory[category] = Number(Math.abs(average).toFixed(2));
  }
  return {
    category_window: {
      start_month: monthKeys[0],
      end_month: monthKeys[monthKeys.length - 1],
      month_keys: monthKeys,
      lookback_months: monthKeys.length,
    },
    by_category: byCategory,
    total_monthly_budget: Object.values(byCategory).reduce((sum, value) => sum + value, 0),
  };
}

async function fetchSpreadGraphData(knex, searchParams) {
  const latestDate = await latestTransactionDate(knex);
  if (!latestDate) {
    return {
      has_data: false,
      latest_transaction_date: null,
      available_months: [],
      window: null,
      categories: [],
      transactions: [],
      january_sort: { sort_month: null, totals: {} },
    };
  }

  const latestMonth = monthKeyFromDate(latestDate);
  const requestedEnd = searchParams.get('end_month');
  let endMonth = requestedEnd ? parseMonthKey(requestedEnd).key : latestMonth;
  if (endMonth > latestMonth) endMonth = latestMonth;
  const startMonth = shiftMonthKey(endMonth, -2);
  const endParsed = parseMonthKey(endMonth);
  const nominalTo = lastDayOfMonth(endParsed.year, endParsed.month);
  const to = endMonth === latestMonth && latestDate < nominalTo ? latestDate : nominalTo;
  const from = `${startMonth}-01`;
  const carryInFrom = addDays(from, -60);

  const monthKeys = [];
  let cursor = monthKeyFromDate((await knex('transactions').min({ min_date: 'date' }).first()).min_date);
  while (cursor <= latestMonth) {
    monthKeys.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
    if (monthKeys.length > 600) break;
  }

  const days = enumerateDays(from, to);
  const rangeTransactions = await fetchTransactionsForRange(knex, carryInFrom, to);

  const transactions = [];
  const categories = new Map();
  for (const tx of rangeTransactions) {
    const amount = Number(tx.amount) || 0;
    transactions.push({
      transaction_id: tx.transaction_id,
      date: tx.date,
      amount,
      amount_abs: Math.abs(amount),
      direction: amount < 0 ? 'expense' : 'income',
      category: tx.category || 'Undefined',
      account_identifier: tx.account_identifier,
      normalized_description: tx.normalized_description,
      raw_description: tx.raw_description,
    });
    const key = tx.category || 'Undefined';
    if (!categories.has(key)) {
      categories.set(key, { category_key: key, category_label: key, transaction_count: 0, total_amount_abs: 0 });
    }
    const category = categories.get(key);
    if (tx.date >= from) {
      category.transaction_count += 1;
      category.total_amount_abs += Math.abs(amount);
    }
  }

  const januarySort = await fetchJanuarySortTotals(knex, endMonth);
  const budget = await fetchBudgetDefaults(knex, endMonth);
  const recurringSeries = await listRecurringSeriesTransactionSpans(knex, new URLSearchParams());
  const categoryRows = [...categories.values()].map((row) => ({
    ...row,
    total_amount_abs: Number(row.total_amount_abs.toFixed(2)),
    january_sort_total_abs: Number((januarySort.totals[row.category_key] || 0).toFixed(2)),
  }));
  categoryRows.sort((left, right) => {
    const janDiff = right.january_sort_total_abs - left.january_sort_total_abs;
    if (Math.abs(janDiff) > 0.0001) return janDiff;
    const windowDiff = right.total_amount_abs - left.total_amount_abs;
    if (Math.abs(windowDiff) > 0.0001) return windowDiff;
    return left.category_label.localeCompare(right.category_label);
  });

  return {
    has_data: true,
    latest_transaction_date: latestDate,
    available_months: monthKeys.map((monthKey) => ({ month_key: monthKey })),
    window: {
      start_month: startMonth,
      end_month: endMonth,
      from,
      to,
      carry_in_from: carryInFrom,
      carry_in_days: 60,
      day_count: days.length,
      days,
      rule: 'three_month_window_ending_selected_month_capped_at_latest_transaction_date_with_60_day_carry_in',
    },
    categories: categoryRows,
    transactions,
    recurring_series: recurringSeries,
    budget: {
      ...budget,
      daily_total: Number((budget.total_monthly_budget / 30.5).toFixed(2)),
    },
    january_sort: januarySort,
  };
}

module.exports = {
  fetchSpreadGraphData,
};
