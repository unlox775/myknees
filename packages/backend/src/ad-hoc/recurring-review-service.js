const { getParser } = require('../classification');
const {
  loadCategoryMaps,
  loadOverrides,
} = require('../classification/resolve-transaction-category');
const { resolveEffectiveCategory } = require('../classification/resolve-effective-category');
const { resolveFormatIdentifier } = require('../reconciliation/resolve-format');
const { DEFAULT_FORMAT_FILTER } = require('./month-bucket-service');

const DEFAULT_WINDOW_MONTHS = 24;
const DEFAULT_ACCOUNT_IDENTIFIERS = ['Ally_Bank', 'Capital_One', 'Chase_VISA'];

const DETECTION_CRITERIA = {
  canonical_window_rule: 'last_24_months_ending_latest_transaction_date_for_selected_accounts',
  cadence_labels: ['monthly', 'every-other-month', 'annual', 'low-confidence'],
  monthly: {
    min_active_months: 3,
    dominant_spacing_months: [1],
    min_spacing_regularity: 0.45,
    max_avg_transactions_per_active_month: 2.2,
  },
  every_other_month: {
    min_active_months: 3,
    dominant_spacing_months: [2],
    min_spacing_regularity: 0.45,
    max_avg_transactions_per_active_month: 2.2,
  },
  annual: {
    min_active_months: 2,
    dominant_spacing_month_range: [10, 14],
    min_spacing_regularity: 0.5,
    min_span_months: 11,
    max_avg_transactions_per_active_month: 1.4,
  },
  low_confidence_pattern: {
    min_active_months: 4,
    min_spacing_regularity: 0.35,
    max_amount_cv: 0.95,
    max_avg_transactions_per_active_month: 1.8,
  },
  confidence_score_formula:
    '0.45*cadence_regularity + 0.30*amount_stability + 0.25*coverage, scaled down for high per-month transaction frequency',
};

const ESSENTIAL_CATEGORIES = new Set([
  'Mortgage & Rent',
  'Bills & Utilities',
  'Insurance',
  'Education',
  'Medical',
  'Home',
  'Cars',
]);

const DISCRETIONARY_CATEGORIES = new Set([
  'Entertainment',
  'Shopping',
  'Eating Out',
  'Travel',
  'Vacation',
  'Bday / Special Day',
]);

const SUBSCRIPTION_CATEGORIES = new Set(['Entertainment']);

const UNKNOWN_CATEGORIES = new Set(['Undefined', 'Misc', 'Kids', 'Food', 'Transfer']);

const ESSENTIAL_KEYWORDS = [
  /mortgage/i,
  /rent/i,
  /utility/i,
  /energy/i,
  /pud/i,
  /comcast/i,
  /xfinity/i,
  /att/i,
  /insurance/i,
  /student\s+ln/i,
  /education/i,
  /waste\s+connection/i,
  /city\s+of/i,
  /farmers\s+ins/i,
  /electric/i,
  /water/i,
  /gas\s+bill/i,
];

const SUBSCRIPTION_KEYWORDS = [
  /subscription/i,
  /subscr/i,
  /spotify/i,
  /netflix/i,
  /hulu/i,
  /patreon/i,
  /chatgpt/i,
  /openai/i,
  /google\s*one/i,
  /apple\.com\/bill/i,
  /steam/i,
  /prime/i,
];

function safeText(value, fallback = '') {
  if (value == null) return fallback;
  return String(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function compareDates(left, right) {
  return String(left).localeCompare(String(right));
}

function compareMonthKeys(left, right) {
  return String(left).localeCompare(String(right));
}

function parseMonthKey(value) {
  const token = safeText(value).trim();
  const match = token.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error(`Invalid month key: ${value}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || year < 1970 || year > 3000) {
    throw new Error(`Invalid month key: ${value}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${value}`);
  }

  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
}

function monthKeyFromDate(dateValue) {
  const token = safeText(dateValue).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(token)) {
    throw new Error(`Invalid date value: ${dateValue}`);
  }
  return token.slice(0, 7);
}

function monthIndex(monthKey) {
  const parsed = parseMonthKey(monthKey);
  return parsed.year * 12 + parsed.month;
}

function monthDiff(fromMonthKey, toMonthKey) {
  return monthIndex(toMonthKey) - monthIndex(fromMonthKey);
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

function lastDayOfMonth(year, month) {
  const d = new Date(Date.UTC(year, month, 0));
  return `${year}-${String(month).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function enumerateMonthKeys(startMonth, endMonth) {
  if (compareMonthKeys(startMonth, endMonth) > 0) {
    throw new Error(`Invalid month range: ${startMonth} is after ${endMonth}`);
  }

  const months = [];
  let cursor = startMonth;
  while (compareMonthKeys(cursor, endMonth) <= 0) {
    months.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
    if (months.length > 600) {
      throw new Error('Month range too large.');
    }
  }
  return months;
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function standardDeviation(values) {
  if (!Array.isArray(values) || values.length < 2) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function smallHash(text) {
  let h = 0;
  const token = safeText(text);
  for (let i = 0; i < token.length; i += 1) {
    h = (h * 31 + token.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function slugify(value, maxLen = 48) {
  const slug = safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!slug) return 'item';
  return slug.slice(0, maxLen).replace(/_+$/g, '') || 'item';
}

function candidateId(normalizedKey, accountIdentifiers) {
  const accountToken = [...accountIdentifiers].sort().join('|');
  return `rr_${slugify(normalizedKey, 36)}_${smallHash(`${normalizedKey}|${accountToken}`)}`;
}

function confidenceLabel(score) {
  if (score >= 0.76) return 'high';
  if (score >= 0.52) return 'medium';
  return 'low';
}

function parseAccountSelection(searchParams) {
  const raw = searchParams.get('accounts');
  if (raw == null || !String(raw).trim()) {
    return {
      account_identifiers: [...DEFAULT_ACCOUNT_IDENTIFIERS],
      account_selection: 'default',
    };
  }

  const token = String(raw).trim();
  if (token.toLowerCase() === 'all') {
    return {
      account_identifiers: [],
      account_selection: 'all',
    };
  }

  const accountIdentifiers = token
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!accountIdentifiers.length) {
    throw new Error('accounts filter is empty. Provide comma-separated account identifiers or "all".');
  }

  return {
    account_identifiers: accountIdentifiers,
    account_selection: 'custom',
  };
}

function parseFormatFilter(searchParams) {
  const raw = searchParams.get('formats');
  if (raw == null || !String(raw).trim()) {
    return [...DEFAULT_FORMAT_FILTER];
  }

  const token = String(raw).trim();
  if (token.toLowerCase() === 'all') return [];

  return token
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function canonicalizeGroupKey(normalizedDescription) {
  let token = safeText(normalizedDescription).toLowerCase();

  token = token.replace(/~\\s*future amount:.*$/i, ' ');
  token = token.replace(/\\btran:\\s*[a-z0-9]+\\b/gi, ' ');
  token = token.replace(/[0-9]{3,}/g, ' ');
  token = token.replace(/[^a-z0-9]+/g, ' ');
  token = token.replace(/\\s+/g, ' ').trim();

  if (!token) return '';

  if (/\\bhlu\\b|\\bhulu\\b/.test(token)) return 'hulu';
  if (/\\bnetflix\\b/.test(token)) return 'netflix';
  if (/\\bspotify\\b/.test(token)) return 'spotify';
  if (/\\bopenai\\b|\\bchatgpt\\b/.test(token)) return 'openai chatgpt';
  if (/\\bapple\\b.*\\bbill\\b/.test(token)) return 'apple bill';
  if (/\\bcomcast\\b|\\bxfinity\\b/.test(token)) return 'comcast xfinity';
  if (/\\batt\\b/.test(token)) return 'att payment';
  if (/\\bwaste\\b.*\\bconnection\\b/.test(token)) return 'waste connection';
  if (/\\bcity\\b.*\\belma\\b/.test(token)) return 'city of elma debits';

  return token;
}

function mostFrequentKey(countMap) {
  if (!(countMap instanceof Map) || countMap.size === 0) return null;
  let best = null;
  let bestCount = -1;
  for (const [key, count] of countMap.entries()) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function toDistribution(countMap) {
  if (!(countMap instanceof Map) || countMap.size === 0) return [];
  const rows = [...countMap.entries()].map(([label, count]) => ({ label, count }));
  rows.sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  return rows;
}

async function resolveLatestTransactionDate(knex, accountIdentifiers) {
  let query = knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .max({ max_date: 'transactions.date' });

  if (Array.isArray(accountIdentifiers) && accountIdentifiers.length > 0) {
    query = query.whereIn('accounts.identifier', accountIdentifiers);
  }

  const row = await query.first();
  return row && row.max_date ? row.max_date : null;
}

async function resolveEarliestTransactionDate(knex, accountIdentifiers) {
  let query = knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .min({ min_date: 'transactions.date' });

  if (Array.isArray(accountIdentifiers) && accountIdentifiers.length > 0) {
    query = query.whereIn('accounts.identifier', accountIdentifiers);
  }

  const row = await query.first();
  return row && row.min_date ? row.min_date : null;
}

async function resolveCanonicalWindow(knex, accountIdentifiers, searchParams) {
  const latestDate = await resolveLatestTransactionDate(knex, accountIdentifiers);
  const earliestDate = await resolveEarliestTransactionDate(knex, accountIdentifiers);

  if (!latestDate) {
    const now = new Date();
    const fallbackMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return {
      canonical_cutoff: `${fallbackMonth}-01`,
      start_month: fallbackMonth,
      end_month: fallbackMonth,
      month_keys: [fallbackMonth],
      month_count: 1,
      from: `${fallbackMonth}-01`,
      to: `${fallbackMonth}-01`,
      history_limited: true,
      history_limit_reason: 'No transactions found for selected accounts.',
    };
  }

  const requestedStart = searchParams.get('start_month');
  const requestedEnd = searchParams.get('end_month');

  let startMonth;
  let endMonth;
  let toDate;
  let windowRule;

  if (requestedStart || requestedEnd) {
    const parsedStart = requestedStart ? parseMonthKey(requestedStart).key : null;
    const parsedEnd = requestedEnd ? parseMonthKey(requestedEnd).key : null;

    endMonth = parsedEnd || parsedStart;
    startMonth = parsedStart || parsedEnd;

    if (compareMonthKeys(startMonth, endMonth) > 0) {
      throw new Error(`Invalid month range: ${startMonth} is after ${endMonth}`);
    }

    toDate = lastDayOfMonth(parseMonthKey(endMonth).year, parseMonthKey(endMonth).month);
    windowRule = 'explicit_month_range';
  } else {
    endMonth = monthKeyFromDate(latestDate);
    startMonth = shiftMonthKey(endMonth, -(DEFAULT_WINDOW_MONTHS - 1));

    if (earliestDate) {
      const earliestMonth = monthKeyFromDate(earliestDate);
      if (compareMonthKeys(startMonth, earliestMonth) < 0) {
        startMonth = earliestMonth;
      }
    }

    toDate = latestDate;
    windowRule = DETECTION_CRITERIA.canonical_window_rule;
  }

  const monthKeys = enumerateMonthKeys(startMonth, endMonth);
  const fromDate = `${startMonth}-01`;
  const historyLimited = monthKeys.length < DEFAULT_WINDOW_MONTHS;

  return {
    canonical_cutoff: latestDate,
    start_month: startMonth,
    end_month: endMonth,
    month_keys: monthKeys,
    month_count: monthKeys.length,
    from: fromDate,
    to: toDate,
    history_limited: historyLimited,
    history_limit_reason: historyLimited
      ? `Only ${monthKeys.length} month(s) available between ${startMonth} and ${endMonth}.`
      : null,
    window_rule: windowRule,
  };
}

async function gatherRows(knex, window, accountIdentifiers) {
  const linkedTargets = await knex('transactions')
    .whereNotNull('linked_transaction_id')
    .pluck('linked_transaction_id');

  const linkedSet = new Set((linkedTargets || []).filter((value) => value != null));

  let query = knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .leftJoin('parse_formats', 'parse_formats.id', 'accounts.parse_format_id')
    .whereBetween('transactions.date', [window.from, window.to])
    .where('transactions.amount', '<', 0)
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
      'accounts.name as account_name',
      'parse_formats.identifier as parse_format_identifier'
    )
    .orderBy('transactions.date', 'asc')
    .orderBy('transactions.id', 'asc');

  if (Array.isArray(accountIdentifiers) && accountIdentifiers.length > 0) {
    query = query.whereIn('accounts.identifier', accountIdentifiers);
  }

  if (linkedSet.size > 0) {
    query = query.whereNotIn('transactions.id', [...linkedSet]);
  }

  return query;
}

function detectCadence(metrics) {
  const {
    active_month_count,
    dominant_spacing_months,
    spacing_regularity,
    span_months,
    avg_transactions_per_active_month,
    amount_cv,
  } = metrics;

  if (
    active_month_count >= DETECTION_CRITERIA.annual.min_active_months &&
    dominant_spacing_months >= DETECTION_CRITERIA.annual.dominant_spacing_month_range[0] &&
    dominant_spacing_months <= DETECTION_CRITERIA.annual.dominant_spacing_month_range[1] &&
    spacing_regularity >= DETECTION_CRITERIA.annual.min_spacing_regularity &&
    span_months >= DETECTION_CRITERIA.annual.min_span_months &&
    avg_transactions_per_active_month <=
      DETECTION_CRITERIA.annual.max_avg_transactions_per_active_month
  ) {
    return {
      label: 'annual',
      cadence_interval_months: 12,
    };
  }

  if (
    active_month_count >= DETECTION_CRITERIA.every_other_month.min_active_months &&
    dominant_spacing_months === 2 &&
    spacing_regularity >= DETECTION_CRITERIA.every_other_month.min_spacing_regularity &&
    avg_transactions_per_active_month <=
      DETECTION_CRITERIA.every_other_month.max_avg_transactions_per_active_month
  ) {
    return {
      label: 'every-other-month',
      cadence_interval_months: 2,
    };
  }

  if (
    active_month_count >= DETECTION_CRITERIA.monthly.min_active_months &&
    dominant_spacing_months <= 1 &&
    spacing_regularity >= DETECTION_CRITERIA.monthly.min_spacing_regularity &&
    avg_transactions_per_active_month <= DETECTION_CRITERIA.monthly.max_avg_transactions_per_active_month
  ) {
    return {
      label: 'monthly',
      cadence_interval_months: 1,
    };
  }

  if (
    active_month_count >= DETECTION_CRITERIA.low_confidence_pattern.min_active_months &&
    spacing_regularity >= DETECTION_CRITERIA.low_confidence_pattern.min_spacing_regularity &&
    amount_cv <= DETECTION_CRITERIA.low_confidence_pattern.max_amount_cv &&
    avg_transactions_per_active_month <=
      DETECTION_CRITERIA.low_confidence_pattern.max_avg_transactions_per_active_month
  ) {
    return {
      label: 'low-confidence',
      cadence_interval_months: Math.max(1, dominant_spacing_months || 1),
    };
  }

  return null;
}

function classifyEssentiality(topCategory, normalizedDescription, rawDescription) {
  const category = safeText(topCategory).trim();
  const joined = `${safeText(normalizedDescription)} ${safeText(rawDescription)}`.toLowerCase();

  const essentialKeywordMatch = ESSENTIAL_KEYWORDS.some((regex) => regex.test(joined));
  const subscriptionKeywordMatch = SUBSCRIPTION_KEYWORDS.some((regex) => regex.test(joined));

  if (essentialKeywordMatch) {
    return {
      essentiality: 'essential',
      candidate_type: 'essential_recurring_bill',
      is_subscription_like: false,
    };
  }

  if (subscriptionKeywordMatch) {
    return {
      essentiality: 'discretionary',
      candidate_type: 'discretionary_subscription',
      is_subscription_like: true,
    };
  }

  if (ESSENTIAL_CATEGORIES.has(category)) {
    return {
      essentiality: 'essential',
      candidate_type: 'essential_recurring_bill',
      is_subscription_like: false,
    };
  }

  if (SUBSCRIPTION_CATEGORIES.has(category)) {
    return {
      essentiality: 'discretionary',
      candidate_type: 'discretionary_subscription',
      is_subscription_like: true,
    };
  }

  if (DISCRETIONARY_CATEGORIES.has(category)) {
    return {
      essentiality: 'discretionary',
      candidate_type: 'discretionary_recurring',
      is_subscription_like: false,
    };
  }

  if (UNKNOWN_CATEGORIES.has(category)) {
    return {
      essentiality: 'unknown',
      candidate_type: 'unknown_recurring',
      is_subscription_like: false,
    };
  }

  return {
    essentiality: 'unknown',
    candidate_type: 'unknown_recurring',
    is_subscription_like: subscriptionKeywordMatch,
  };
}

function calculateConfidence(metrics, windowMonthCount, cadenceLabel) {
  const cadenceRegularity = Number(metrics.spacing_regularity) || 0;
  const amountStability = clamp(1 - (Number(metrics.amount_cv) || 0), 0, 1);
  const coverage = clamp((Number(metrics.active_month_count) || 0) / Math.max(1, Math.min(windowMonthCount, 12)), 0, 1);

  let frequencyScale = 1;
  if (metrics.avg_transactions_per_active_month > 2.3) {
    frequencyScale = 0.62;
  } else if (metrics.avg_transactions_per_active_month > 1.8) {
    frequencyScale = 0.78;
  } else if (metrics.avg_transactions_per_active_month > 1.4) {
    frequencyScale = 0.9;
  }

  let score =
    (cadenceRegularity * 0.45 + amountStability * 0.3 + coverage * 0.25) * frequencyScale;

  if (cadenceLabel === 'annual' && metrics.active_month_count === 2) {
    score = Math.min(score, 0.6);
  }

  return round2(clamp(score, 0.05, 0.99));
}

function computeSpacingMetrics(activeMonthKeys) {
  if (!Array.isArray(activeMonthKeys) || activeMonthKeys.length < 2) {
    return {
      dominant_spacing_months: 0,
      spacing_regularity: 0,
      spacings: [],
    };
  }

  const spacings = [];
  for (let i = 1; i < activeMonthKeys.length; i += 1) {
    spacings.push(monthDiff(activeMonthKeys[i - 1], activeMonthKeys[i]));
  }

  const counts = new Map();
  for (const spacing of spacings) {
    counts.set(spacing, (counts.get(spacing) || 0) + 1);
  }

  let dominantSpacing = 0;
  let dominantCount = 0;
  for (const [spacing, count] of counts.entries()) {
    if (count > dominantCount) {
      dominantSpacing = spacing;
      dominantCount = count;
    }
  }

  return {
    dominant_spacing_months: dominantSpacing,
    spacing_regularity: spacings.length ? dominantCount / spacings.length : 0,
    spacings,
  };
}

function buildEvidencePoints(metrics) {
  return [
    `${metrics.transaction_count} transactions across ${metrics.active_month_count} active month(s)`,
    `dominant spacing ${metrics.dominant_spacing_months || 'n/a'} month(s), regularity ${round2(
      metrics.spacing_regularity
    ).toFixed(2)}`,
    `amount CV ${round2(metrics.amount_cv).toFixed(2)} (lower is more stable)`,
  ];
}

function normalizeDisplayName(rawDescription, normalizedDescription) {
  const raw = safeText(rawDescription).replace(/\s+/g, ' ').trim();
  if (raw) return raw;
  const normalized = safeText(normalizedDescription).replace(/\s+/g, ' ').trim();
  return normalized || 'Unlabeled recurring candidate';
}

function parseSortKey(searchParams) {
  const token = safeText(searchParams.get('sort')).trim().toLowerCase();
  if (!token) return 'confidence_desc';

  const supported = new Set([
    'confidence_desc',
    'monthly_equivalent_desc',
    'annual_equivalent_desc',
    'subscriptions_first',
    'annual_first',
    'essential_first',
  ]);

  return supported.has(token) ? token : 'confidence_desc';
}

function parseLabelFilter(searchParams) {
  const token = safeText(searchParams.get('label')).trim().toLowerCase();
  if (!token || token === 'all') return null;
  return token;
}

function sortCandidates(candidates, sortKey) {
  const rows = [...candidates];

  rows.sort((left, right) => {
    if (sortKey === 'monthly_equivalent_desc') {
      if (right.amount.monthly_equivalent !== left.amount.monthly_equivalent) {
        return right.amount.monthly_equivalent - left.amount.monthly_equivalent;
      }
    }

    if (sortKey === 'annual_equivalent_desc') {
      if (right.amount.annual_equivalent !== left.amount.annual_equivalent) {
        return right.amount.annual_equivalent - left.amount.annual_equivalent;
      }
    }

    if (sortKey === 'subscriptions_first') {
      if (left.is_subscription_like !== right.is_subscription_like) {
        return left.is_subscription_like ? -1 : 1;
      }
    }

    if (sortKey === 'annual_first') {
      const leftAnnual = left.cadence.label === 'annual';
      const rightAnnual = right.cadence.label === 'annual';
      if (leftAnnual !== rightAnnual) {
        return leftAnnual ? -1 : 1;
      }
    }

    if (sortKey === 'essential_first') {
      const weight = { essential: 0, discretionary: 1, unknown: 2 };
      const leftWeight = weight[left.essentiality] == null ? 99 : weight[left.essentiality];
      const rightWeight = weight[right.essentiality] == null ? 99 : weight[right.essentiality];
      if (leftWeight !== rightWeight) {
        return leftWeight - rightWeight;
      }
    }

    if (right.confidence.score !== left.confidence.score) {
      return right.confidence.score - left.confidence.score;
    }

    if (right.amount.monthly_equivalent !== left.amount.monthly_equivalent) {
      return right.amount.monthly_equivalent - left.amount.monthly_equivalent;
    }

    return left.display_name.localeCompare(right.display_name);
  });

  return rows;
}

function filterCandidates(candidates, labelFilter) {
  if (!labelFilter) return [...candidates];
  return candidates.filter((candidate) => candidate.label_set.includes(labelFilter));
}

async function buildRecurringReviewModel(knex, searchParams) {
  const accountSelection = parseAccountSelection(searchParams);
  const formatFilter = parseFormatFilter(searchParams);
  const window = await resolveCanonicalWindow(knex, accountSelection.account_identifiers, searchParams);
  const rows = await gatherRows(knex, window, accountSelection.account_identifiers);

  const categoryMap = await loadCategoryMaps(knex);
  const overrideMap = await loadOverrides(knex);
  const accountFormatCache = new Map();

  const groups = new Map();
  let skippedByFormat = 0;

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

    if (Array.isArray(formatFilter) && formatFilter.length > 0 && !formatFilter.includes(formatId)) {
      skippedByFormat += 1;
      continue;
    }

    const rawDescription = safeText(row.description);
    const parser = getParser(formatId);
    const normalizedDescription = parser
      ? parser.normalize(rawDescription)
      : rawDescription.trim().toLowerCase();

    if (!normalizedDescription) continue;

    const resolved = resolveEffectiveCategory(
      row,
      formatId,
      rawDescription,
      normalizedDescription,
      overrideMap,
      categoryMap
    );

    const groupKey = canonicalizeGroupKey(normalizedDescription) || normalizedDescription;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        normalized_description: groupKey,
        normalized_variants: new Map(),
        account_identifiers: new Set(),
        categories: new Map(),
        raw_descriptions: new Map(),
        amounts_abs: [],
        monthly_totals: new Map(),
        transactions: [],
        first_seen_date: row.date,
        last_seen_date: row.date,
      });
    }

    const group = groups.get(groupKey);
    const amountAbs = Math.abs(Number(row.amount) || 0);
    const monthKey = monthKeyFromDate(row.date);

    group.account_identifiers.add(row.account_identifier);
    group.normalized_variants.set(
      normalizedDescription,
      (group.normalized_variants.get(normalizedDescription) || 0) + 1
    );
    group.categories.set(resolved.category, (group.categories.get(resolved.category) || 0) + 1);
    group.raw_descriptions.set(rawDescription, (group.raw_descriptions.get(rawDescription) || 0) + 1);
    group.amounts_abs.push(amountAbs);

    if (!group.monthly_totals.has(monthKey)) {
      group.monthly_totals.set(monthKey, { total_amount: 0, transaction_count: 0 });
    }
    const monthTotals = group.monthly_totals.get(monthKey);
    monthTotals.total_amount += amountAbs;
    monthTotals.transaction_count += 1;

    if (compareDates(row.date, group.first_seen_date) < 0) {
      group.first_seen_date = row.date;
    }
    if (compareDates(row.date, group.last_seen_date) > 0) {
      group.last_seen_date = row.date;
    }

    group.transactions.push({
      transaction_id: row.id,
      date: row.date,
      account_identifier: row.account_identifier,
      account_name: row.account_name,
      amount: round2(Number(row.amount) || 0),
      amount_abs: round2(amountAbs),
      raw_description: rawDescription,
      normalized_description: normalizedDescription,
      category: resolved.category,
      category_source: resolved.source,
      rule_source: resolved.rule_source,
    });
  }

  const candidates = [];
  const detailsById = new Map();

  for (const group of groups.values()) {
    const activeMonthKeys = [...group.monthly_totals.keys()].sort((a, b) => a.localeCompare(b));
    if (activeMonthKeys.length < 2 || group.transactions.length < 2) continue;

    const spacing = computeSpacingMetrics(activeMonthKeys);
    const monthlyTotals = activeMonthKeys.map((monthKey) => group.monthly_totals.get(monthKey).total_amount);
    const spanMonths = monthDiff(activeMonthKeys[0], activeMonthKeys[activeMonthKeys.length - 1]) + 1;
    const amountMedian = median(monthlyTotals);
    const amountSd = standardDeviation(monthlyTotals);
    const amountCv = amountMedian > 0 ? amountSd / amountMedian : 1;

    const metrics = {
      transaction_count: group.transactions.length,
      active_month_count: activeMonthKeys.length,
      span_months: spanMonths,
      dominant_spacing_months: spacing.dominant_spacing_months,
      spacing_regularity: spacing.spacing_regularity,
      avg_transactions_per_active_month: group.transactions.length / activeMonthKeys.length,
      amount_cv: amountCv,
    };

    const cadence = detectCadence(metrics);
    if (!cadence) continue;

    const topRawDescription = mostFrequentKey(group.raw_descriptions);
    const topNormalizedVariant = mostFrequentKey(group.normalized_variants) || group.normalized_description;
    const topCategory = mostFrequentKey(group.categories) || 'Undefined';
    const classInfo = classifyEssentiality(topCategory, topNormalizedVariant, topRawDescription);

    let confidenceScore = calculateConfidence(metrics, window.month_count, cadence.label);
    if (
      cadence.label === 'annual' &&
      classInfo.essentiality !== 'essential' &&
      !classInfo.is_subscription_like
    ) {
      confidenceScore = Math.min(confidenceScore, 0.48);
    }
    const confidence = {
      label: confidenceLabel(confidenceScore),
      score: confidenceScore,
    };

    const cadenceInterval = Math.max(1, Number(cadence.cadence_interval_months) || 1);
    const annualEquivalent = round2(amountMedian * (12 / cadenceInterval));
    const monthlyEquivalent = round2(annualEquivalent / 12);

    const id = candidateId(group.normalized_description, group.account_identifiers);
    const displayName = normalizeDisplayName(topRawDescription, group.normalized_description);

    const history = window.month_keys.map((monthKey) => {
      const monthTotals = group.monthly_totals.get(monthKey) || {
        total_amount: 0,
        transaction_count: 0,
      };
      return {
        month_key: monthKey,
        total_amount: round2(monthTotals.total_amount),
        transaction_count: monthTotals.transaction_count,
      };
    });

    const labelSet = [classInfo.essentiality, cadence.label];
    if (classInfo.is_subscription_like) labelSet.push('subscription');
    if (confidence.label === 'low' && !labelSet.includes('low-confidence')) {
      labelSet.push('low-confidence');
    }

    const candidate = {
      candidate_id: id,
      display_name: displayName,
      normalized_key: group.normalized_description,
      normalized_variants: toDistribution(group.normalized_variants).slice(0, 4).map((row) => ({
        normalized_description: row.label,
        count: row.count,
      })),
      account_identifiers: [...group.account_identifiers].sort((a, b) => a.localeCompare(b)),
      account_count: group.account_identifiers.size,
      category: topCategory,
      category_distribution: toDistribution(group.categories).slice(0, 4).map((row) => ({
        category: row.label,
        count: row.count,
      })),
      cadence: {
        label: cadence.label,
        cadence_interval_months: cadenceInterval,
        spacing_regularity: round2(metrics.spacing_regularity),
        dominant_spacing_months: metrics.dominant_spacing_months,
      },
      confidence,
      essentiality: classInfo.essentiality,
      candidate_type: classInfo.candidate_type,
      is_subscription_like: Boolean(classInfo.is_subscription_like),
      occurrence_count: group.transactions.length,
      months_observed: activeMonthKeys.length,
      first_seen_date: group.first_seen_date,
      last_seen_date: group.last_seen_date,
      amount: {
        median_charge: round2(median(group.amounts_abs)),
        average_charge: round2(
          group.amounts_abs.length
            ? group.amounts_abs.reduce((sum, value) => sum + value, 0) / group.amounts_abs.length
            : 0
        ),
        monthly_equivalent: monthlyEquivalent,
        annual_equivalent: annualEquivalent,
      },
      label_set: [...new Set(labelSet)].sort((a, b) => a.localeCompare(b)),
      history,
      evidence_points: buildEvidencePoints(metrics),
      detail_path: `/api/ad-hoc/recurring-review/candidates/${encodeURIComponent(id)}/transactions`,
    };

    candidates.push(candidate);

    detailsById.set(
      id,
      [...group.transactions].sort((left, right) => {
        if (compareDates(right.date, left.date) !== 0) {
          return compareDates(right.date, left.date);
        }
        return right.transaction_id - left.transaction_id;
      })
    );
  }

  return {
    account_identifiers:
      accountSelection.account_identifiers.length > 0
        ? accountSelection.account_identifiers
        : ['all'],
    account_selection: accountSelection.account_selection,
    canonical_window: {
      start_month: window.start_month,
      end_month: window.end_month,
      month_count: window.month_count,
      from: window.from,
      to: window.to,
      canonical_cutoff: window.canonical_cutoff,
      window_rule: window.window_rule,
      history_limited: window.history_limited,
      history_limit_reason: window.history_limit_reason,
    },
    detection_criteria: DETECTION_CRITERIA,
    scanned_transaction_count: rows.length,
    skipped_by_format: skippedByFormat,
    format_filter: formatFilter.length ? formatFilter : ['all'],
    candidates,
    details_by_id: detailsById,
  };
}

function summarizeTotals(candidates) {
  const totals = {
    candidate_count: candidates.length,
    monthly_equivalent_total: 0,
    annual_equivalent_total: 0,
    by_essentiality: {
      essential: 0,
      discretionary: 0,
      unknown: 0,
    },
    by_cadence_label: {
      monthly: 0,
      'every-other-month': 0,
      annual: 0,
      'low-confidence': 0,
    },
  };

  for (const candidate of candidates) {
    totals.monthly_equivalent_total += Number(candidate.amount.monthly_equivalent) || 0;
    totals.annual_equivalent_total += Number(candidate.amount.annual_equivalent) || 0;

    if (totals.by_essentiality[candidate.essentiality] != null) {
      totals.by_essentiality[candidate.essentiality] += 1;
    }

    if (totals.by_cadence_label[candidate.cadence.label] != null) {
      totals.by_cadence_label[candidate.cadence.label] += 1;
    }
  }

  totals.monthly_equivalent_total = round2(totals.monthly_equivalent_total);
  totals.annual_equivalent_total = round2(totals.annual_equivalent_total);

  return totals;
}

async function listRecurringCandidates(knex, searchParams) {
  const model = await buildRecurringReviewModel(knex, searchParams);
  const sort = parseSortKey(searchParams);
  const labelFilter = parseLabelFilter(searchParams);

  const filtered = filterCandidates(model.candidates, labelFilter);
  const sorted = sortCandidates(filtered, sort);

  return {
    account_identifiers: model.account_identifiers,
    account_selection: model.account_selection,
    canonical_window: model.canonical_window,
    detection_criteria: model.detection_criteria,
    scanned_transaction_count: model.scanned_transaction_count,
    skipped_by_format: model.skipped_by_format,
    format_filter: model.format_filter,
    applied_filters: {
      sort,
      label: labelFilter || 'all',
    },
    totals: summarizeTotals(sorted),
    candidates: sorted,
  };
}

async function getRecurringCandidateTransactions(knex, searchParams, candidateId) {
  const model = await buildRecurringReviewModel(knex, searchParams);

  const candidate = model.candidates.find((row) => row.candidate_id === candidateId);
  if (!candidate) {
    throw new Error(`Recurring candidate not found for id: ${candidateId}`);
  }

  const transactions = model.details_by_id.get(candidateId) || [];

  return {
    account_identifiers: model.account_identifiers,
    account_selection: model.account_selection,
    canonical_window: model.canonical_window,
    candidate,
    transaction_count: transactions.length,
    transactions,
  };
}

module.exports = {
  DETECTION_CRITERIA,
  listRecurringCandidates,
  getRecurringCandidateTransactions,
};
