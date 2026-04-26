const {
  DEFAULT_FORMAT_FILTER,
  fetchMonthBucketData,
  getBucketDetails,
} = require('./month-bucket-service');

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const PRESET_LAST_12_MONTHS = 'last_12_months';
const PRESET_YEAR_TO_DATE = 'year_to_date';
const PRESET_CUSTOM = 'custom';
const CANONICAL_CUTOFF_RULE = 'last_12_months_ending_latest_transaction_month';

function toMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonthKey(rawValue) {
  if (rawValue == null || String(rawValue).trim() === '') {
    throw new Error('Month must be provided as YYYY-MM.');
  }

  const token = String(rawValue).trim();
  const match = token.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid month key: ${rawValue}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || year < 1970 || year > 3000) {
    throw new Error(`Invalid month key: ${rawValue}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${rawValue}`);
  }

  return {
    year,
    month,
    key: toMonthKey(year, month),
  };
}

function monthKeyFromDate(dateValue) {
  const token = String(dateValue || '').trim();
  const match = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date value: ${dateValue}`);
  }
  return `${match[1]}-${match[2]}`;
}

function monthLabel(monthKey) {
  const parsed = parseMonthKey(monthKey);
  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
}

function lastDayOfMonth(year, month) {
  const d = new Date(Date.UTC(year, month, 0));
  const day = d.getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function compareMonthKeys(leftMonthKey, rightMonthKey) {
  return leftMonthKey.localeCompare(rightMonthKey);
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

  return toMonthKey(year, month);
}

function enumerateMonthKeys(startMonthKey, endMonthKey) {
  if (compareMonthKeys(startMonthKey, endMonthKey) > 0) {
    throw new Error(`Invalid range: ${startMonthKey} is after ${endMonthKey}.`);
  }

  const monthKeys = [];
  let cursor = startMonthKey;

  while (compareMonthKeys(cursor, endMonthKey) <= 0) {
    monthKeys.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
    if (monthKeys.length > 600) {
      throw new Error('Requested month range is too large.');
    }
  }

  return monthKeys;
}

function buildMonthWindow(monthKey) {
  const parsed = parseMonthKey(monthKey);
  return {
    year: parsed.year,
    month: parsed.month,
    from: `${parsed.key}-01`,
    to: lastDayOfMonth(parsed.year, parsed.month),
    label: `${parsed.key}-01 … ${lastDayOfMonth(parsed.year, parsed.month)}`,
  };
}

function normalizePreset(rawPreset) {
  const preset = String(rawPreset || '').trim().toLowerCase();
  if (preset === PRESET_YEAR_TO_DATE || preset === 'ytd') return PRESET_YEAR_TO_DATE;
  if (preset === PRESET_LAST_12_MONTHS || preset === '') return PRESET_LAST_12_MONTHS;
  return PRESET_CUSTOM;
}

async function fetchAvailableDataWindow(knex) {
  const row = await knex('transactions')
    .whereNotNull('date')
    .min({ min_date: 'date' })
    .max({ max_date: 'date' })
    .count({ transaction_count: 'id' })
    .first();

  const transactionCount = Number(row && row.transaction_count != null ? row.transaction_count : 0);
  if (!row || !row.min_date || !row.max_date || !Number.isFinite(transactionCount) || transactionCount < 1) {
    return {
      has_data: false,
      transaction_count: 0,
      min_date: null,
      max_date: null,
      earliest_month: null,
      latest_month: null,
      latest_month_incomplete: false,
    };
  }

  const earliestMonth = monthKeyFromDate(row.min_date);
  const latestMonth = monthKeyFromDate(row.max_date);
  const latestParsed = parseMonthKey(latestMonth);
  const latestLastDay = Number(lastDayOfMonth(latestParsed.year, latestParsed.month).slice(-2));
  const latestDay = Number(String(row.max_date).slice(-2));

  return {
    has_data: true,
    transaction_count: transactionCount,
    min_date: row.min_date,
    max_date: row.max_date,
    earliest_month: earliestMonth,
    latest_month: latestMonth,
    latest_month_incomplete: Number.isFinite(latestDay) && Number.isFinite(latestLastDay)
      ? latestDay < latestLastDay
      : false,
  };
}

function buildDefaultRange(availableWindow) {
  if (!availableWindow.has_data) {
    return {
      start_month: null,
      end_month: null,
      month_count: 0,
      full_available_window: false,
    };
  }

  const endMonth = availableWindow.latest_month;
  let startMonth = shiftMonthKey(endMonth, -11);
  if (compareMonthKeys(startMonth, availableWindow.earliest_month) < 0) {
    startMonth = availableWindow.earliest_month;
  }

  const monthCount = enumerateMonthKeys(startMonth, endMonth).length;
  return {
    start_month: startMonth,
    end_month: endMonth,
    month_count: monthCount,
    full_available_window: compareMonthKeys(startMonth, availableWindow.earliest_month) === 0,
  };
}

function buildAvailableMonths(availableWindow) {
  if (!availableWindow.has_data) return [];

  const monthKeys = enumerateMonthKeys(availableWindow.earliest_month, availableWindow.latest_month);
  return monthKeys.map((monthKey) => ({
    month_key: monthKey,
    month_label: monthLabel(monthKey),
    is_incomplete_month: availableWindow.latest_month_incomplete && monthKey === availableWindow.latest_month,
  }));
}

function resolveRange(searchParams, availableWindow) {
  const defaultRange = buildDefaultRange(availableWindow);

  if (!availableWindow.has_data) {
    return {
      has_data: false,
      preset_applied: PRESET_LAST_12_MONTHS,
      start_month: null,
      end_month: null,
      requested_start_month: null,
      requested_end_month: null,
      month_count: 0,
      month_keys: [],
      default_start_month: null,
      default_end_month: null,
      full_available_window: false,
      truncated_to_available: false,
    };
  }

  const preset = normalizePreset(searchParams.get('preset'));
  const rawStart = searchParams.get('start_month');
  const rawEnd = searchParams.get('end_month');

  let startMonth = rawStart ? parseMonthKey(rawStart).key : null;
  let endMonth = rawEnd ? parseMonthKey(rawEnd).key : null;
  let presetApplied = PRESET_CUSTOM;

  if (!startMonth && !endMonth) {
    if (preset === PRESET_YEAR_TO_DATE) {
      presetApplied = PRESET_YEAR_TO_DATE;
      endMonth = availableWindow.latest_month;
      const year = endMonth.slice(0, 4);
      startMonth = `${year}-01`;
    } else {
      presetApplied = PRESET_LAST_12_MONTHS;
      startMonth = defaultRange.start_month;
      endMonth = defaultRange.end_month;
    }
  } else {
    if (!startMonth) startMonth = availableWindow.earliest_month;
    if (!endMonth) endMonth = availableWindow.latest_month;
  }

  if (compareMonthKeys(startMonth, endMonth) > 0) {
    throw new Error(`Invalid range: start_month ${startMonth} is after end_month ${endMonth}.`);
  }

  const requestedStartMonth = startMonth;
  const requestedEndMonth = endMonth;

  if (compareMonthKeys(startMonth, availableWindow.earliest_month) < 0) {
    startMonth = availableWindow.earliest_month;
  }
  if (compareMonthKeys(endMonth, availableWindow.latest_month) > 0) {
    endMonth = availableWindow.latest_month;
  }

  if (compareMonthKeys(startMonth, endMonth) > 0) {
    throw new Error(
      `Requested range ${requestedStartMonth} … ${requestedEndMonth} falls outside available data window.`
    );
  }

  const monthKeys = enumerateMonthKeys(startMonth, endMonth);

  return {
    has_data: true,
    preset_applied: presetApplied,
    start_month: startMonth,
    end_month: endMonth,
    requested_start_month: requestedStartMonth,
    requested_end_month: requestedEndMonth,
    month_count: monthKeys.length,
    month_keys: monthKeys,
    default_start_month: defaultRange.start_month,
    default_end_month: defaultRange.end_month,
    full_available_window:
      compareMonthKeys(startMonth, availableWindow.earliest_month) === 0 &&
      compareMonthKeys(endMonth, availableWindow.latest_month) === 0,
    truncated_to_available:
      startMonth !== requestedStartMonth || endMonth !== requestedEndMonth,
  };
}

function buildCanonicalCutoff(availableWindow) {
  return {
    rule: CANONICAL_CUTOFF_RULE,
    has_data: availableWindow.has_data,
    earliest_transaction_date: availableWindow.min_date,
    latest_transaction_date: availableWindow.max_date,
    earliest_month: availableWindow.earliest_month,
    latest_month: availableWindow.latest_month,
    latest_month_incomplete: availableWindow.latest_month_incomplete,
  };
}

async function gatherMonthlyReports(knex, range, options = {}) {
  const reports = [];

  for (const monthKey of range.month_keys) {
    const window = buildMonthWindow(monthKey);
    const report = await fetchMonthBucketData(knex, window, options);
    reports.push({
      month_key: monthKey,
      month_label: monthLabel(monthKey),
      is_incomplete_month: false,
      window,
      report,
    });
  }

  return reports;
}

function finalizeCategoryTotals(aggregateByCategory) {
  const categories = [...aggregateByCategory.values()].map((row) => ({
    ...row,
    total_amount: Number(row.total_amount.toFixed(2)),
  }));

  categories.sort((left, right) => {
    const magnitude = Math.abs(right.total_amount) - Math.abs(left.total_amount);
    if (Math.abs(magnitude) > 0.0001) return magnitude;
    return left.category_label.localeCompare(right.category_label);
  });

  return categories;
}

function buildCategoryDetailPath(categoryKey, monthKey) {
  return `/api/ad-hoc/category-trends/${encodeURIComponent(categoryKey)}/months/${monthKey}/transactions`;
}

function buildMonthBrowserPath(monthKey) {
  const parsed = parseMonthKey(monthKey);
  return `/ad-hoc/month-buckets?year=${parsed.year}&month=${parsed.month}`;
}

async function fetchCategoryCatalog(knex, searchParams, options = {}) {
  const availableWindow = await fetchAvailableDataWindow(knex);
  const canonicalCutoff = buildCanonicalCutoff(availableWindow);
  const range = resolveRange(searchParams, availableWindow);
  const availableMonths = buildAvailableMonths(availableWindow);
  const formatFilter = Array.isArray(options.formatFilter)
    ? options.formatFilter
    : DEFAULT_FORMAT_FILTER;

  if (!range.has_data) {
    return {
      canonical_cutoff: canonicalCutoff,
      range,
      available_months: availableMonths,
      include_linked: Boolean(options.includeLinked),
      format_filter: formatFilter,
      categories: [],
      default_category_key: null,
    };
  }

  const monthlyReports = await gatherMonthlyReports(knex, range, options);
  const aggregateByCategory = new Map();

  for (const month of monthlyReports) {
    month.is_incomplete_month =
      availableWindow.latest_month_incomplete && month.month_key === availableWindow.latest_month;

    for (const bucket of month.report.buckets) {
      if (!aggregateByCategory.has(bucket.bucket)) {
        aggregateByCategory.set(bucket.bucket, {
          category_key: bucket.bucket,
          category_label: bucket.bucket,
          transaction_count: 0,
          total_amount: 0,
        });
      }

      const agg = aggregateByCategory.get(bucket.bucket);
      agg.transaction_count += Number(bucket.transaction_count) || 0;
      agg.total_amount += Number(bucket.total_amount) || 0;
    }
  }

  const categories = finalizeCategoryTotals(aggregateByCategory);

  return {
    canonical_cutoff: canonicalCutoff,
    range,
    available_months: availableMonths,
    include_linked: Boolean(options.includeLinked),
    format_filter: formatFilter,
    categories,
    default_category_key: categories.length ? categories[0].category_key : null,
  };
}

async function fetchCategoryTrend(knex, searchParams, rawCategoryKey, options = {}) {
  const categoryKey = String(rawCategoryKey || '').trim();
  if (!categoryKey) {
    throw new Error('Query parameter "category" is required.');
  }

  const availableWindow = await fetchAvailableDataWindow(knex);
  const canonicalCutoff = buildCanonicalCutoff(availableWindow);
  const range = resolveRange(searchParams, availableWindow);
  const availableMonths = buildAvailableMonths(availableWindow);
  const formatFilter = Array.isArray(options.formatFilter)
    ? options.formatFilter
    : DEFAULT_FORMAT_FILTER;

  if (!range.has_data) {
    return {
      canonical_cutoff: canonicalCutoff,
      range,
      available_months: availableMonths,
      include_linked: Boolean(options.includeLinked),
      format_filter: formatFilter,
      category: {
        category_key: categoryKey,
        category_label: categoryKey,
      },
      totals: {
        transaction_count: 0,
        total_amount: 0,
        months_with_activity: 0,
        month_count: 0,
      },
      months: [],
      category_found_in_range: false,
    };
  }

  const monthlyReports = await gatherMonthlyReports(knex, range, options);
  const monthRows = [];
  let totalAmount = 0;
  let transactionCount = 0;
  let monthsWithActivity = 0;
  let maxAbsoluteTotal = 0;

  for (const month of monthlyReports) {
    const bucket = month.report.buckets.find((row) => row.bucket === categoryKey);
    const monthAmount = Number(bucket ? bucket.total_amount : 0);
    const monthCount = Number(bucket ? bucket.transaction_count : 0);

    if (monthCount > 0) monthsWithActivity += 1;
    if (Math.abs(monthAmount) > maxAbsoluteTotal) maxAbsoluteTotal = Math.abs(monthAmount);

    totalAmount += monthAmount;
    transactionCount += monthCount;

    monthRows.push({
      month_key: month.month_key,
      month_label: month.month_label,
      is_incomplete_month:
        availableWindow.latest_month_incomplete && month.month_key === availableWindow.latest_month,
      transaction_count: monthCount,
      total_amount: Number(monthAmount.toFixed(2)),
      detail_path: buildCategoryDetailPath(categoryKey, month.month_key),
      month_bucket_browser_path: buildMonthBrowserPath(month.month_key),
    });
  }

  return {
    canonical_cutoff: canonicalCutoff,
    range,
    available_months: availableMonths,
    include_linked: Boolean(options.includeLinked),
    format_filter: formatFilter,
    category: {
      category_key: categoryKey,
      category_label: categoryKey,
    },
    totals: {
      transaction_count: transactionCount,
      total_amount: Number(totalAmount.toFixed(2)),
      months_with_activity: monthsWithActivity,
      month_count: monthRows.length,
      max_absolute_month_total: Number(maxAbsoluteTotal.toFixed(2)),
    },
    months: monthRows,
    category_found_in_range: monthsWithActivity > 0,
  };
}

async function fetchCategoryMonthDetails(knex, rawCategoryKey, rawMonthKey, options = {}) {
  const categoryKey = String(rawCategoryKey || '').trim();
  if (!categoryKey) {
    throw new Error('Category path parameter is required.');
  }

  const parsedMonth = parseMonthKey(rawMonthKey);
  const monthKey = parsedMonth.key;
  const monthWindow = buildMonthWindow(monthKey);
  const report = await fetchMonthBucketData(knex, monthWindow, options);
  const details = getBucketDetails(report, categoryKey);

  const availableWindow = await fetchAvailableDataWindow(knex);
  const isIncompleteMonth =
    availableWindow.latest_month_incomplete && availableWindow.latest_month === monthKey;

  return {
    category: {
      category_key: categoryKey,
      category_label: categoryKey,
    },
    window: {
      ...monthWindow,
      month_key: monthKey,
      month_label: monthLabel(monthKey),
      is_incomplete_month: isIncompleteMonth,
    },
    transaction_count: details.transaction_count,
    total_amount: details.total_amount,
    month_bucket_browser_path: buildMonthBrowserPath(monthKey),
    transactions: details.transactions,
  };
}

module.exports = {
  CANONICAL_CUTOFF_RULE,
  PRESET_LAST_12_MONTHS,
  PRESET_YEAR_TO_DATE,
  PRESET_CUSTOM,
  parseMonthKey,
  fetchCategoryCatalog,
  fetchCategoryTrend,
  fetchCategoryMonthDetails,
};
