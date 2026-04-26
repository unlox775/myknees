const { getParser } = require('../classification');
const { nowEpoch } = require('../db/dates');
const { resolveFormatIdentifier } = require('../reconciliation/resolve-format');
const { fetchMonthBucketData } = require('./month-bucket-service');

const DEFAULT_ACCOUNT_IDENTIFIER = 'Ally_Bank';
const DEFAULT_FORECAST_MONTHS = 6;
const MAX_FORECAST_MONTHS = 24;
const MAX_CANDIDATES = 50;
const DEFAULT_CATEGORY_LOOKBACK_MONTHS = 3;
const MAX_CATEGORY_LOOKBACK_MONTHS = 24;
const DEFAULT_LOW_BALANCE_WARNING = 500;
const SEEDED_ACCOUNTS = new Set();

const SIGN_CONVENTION = {
  income_positive: true,
  expense_negative: true,
  rule: 'Forecast rows use signed cashflow amounts: income > 0, expense < 0.',
};

function asBool(value, fallback = false) {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value;
  const token = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(token)) return true;
  if (['0', 'false', 'no', 'off'].includes(token)) return false;
  return fallback;
}

function asNumber(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseJsonOrNull(value) {
  if (value == null || value === '') return null;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function toJsonText(value) {
  if (value == null) return null;
  return JSON.stringify(value);
}

function safeDateToken(value) {
  const token = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(token)) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return token;
}

function toMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonthKey(value) {
  const token = String(value || '').trim();
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

  return { year, month, key: toMonthKey(year, month) };
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

function compareMonthKeys(left, right) {
  return left.localeCompare(right);
}

function enumerateMonthKeys(startMonthKey, endMonthKey) {
  if (compareMonthKeys(startMonthKey, endMonthKey) > 0) {
    throw new Error(`Invalid range: ${startMonthKey} is after ${endMonthKey}.`);
  }

  const keys = [];
  let cursor = startMonthKey;
  while (compareMonthKeys(cursor, endMonthKey) <= 0) {
    keys.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
    if (keys.length > 600) {
      throw new Error('Month range too large.');
    }
  }
  return keys;
}

function lastDayOfMonth(year, month) {
  const d = new Date(Date.UTC(year, month, 0));
  return `${year}-${String(month).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function monthKeyFromDate(dateValue) {
  const token = safeDateToken(dateValue);
  return token.slice(0, 7);
}

function dateFromMonthKey(monthKey) {
  const parsed = parseMonthKey(monthKey);
  return `${parsed.key}-01`;
}

function toDateObject(dateValue) {
  const token = safeDateToken(dateValue);
  const parsed = new Date(`${token}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${dateValue}`);
  }
  return parsed;
}

function formatDateObjectUtc(dateObj) {
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateValue, days) {
  const d = toDateObject(dateValue);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return formatDateObjectUtc(d);
}

function dayOfMonth(dateValue) {
  const token = safeDateToken(dateValue);
  return Number(token.slice(8, 10));
}

function clampDayInMonth(monthKey, desiredDay) {
  const parsed = parseMonthKey(monthKey);
  const day = clamp(Number(desiredDay) || 1, 1, 31);
  const monthEnd = Number(lastDayOfMonth(parsed.year, parsed.month).slice(-2));
  const finalDay = clamp(day, 1, monthEnd);
  return `${parsed.key}-${String(finalDay).padStart(2, '0')}`;
}

function monthIndex(monthKey) {
  const parsed = parseMonthKey(monthKey);
  return parsed.year * 12 + parsed.month;
}

function monthDiff(fromMonthKey, toMonthKey) {
  return monthIndex(toMonthKey) - monthIndex(fromMonthKey);
}

function compareDates(left, right) {
  return String(left).localeCompare(String(right));
}

function withinDateRange(dateValue, fromInclusive, toInclusive) {
  return compareDates(dateValue, fromInclusive) >= 0 && compareDates(dateValue, toInclusive) <= 0;
}

function safeText(value, fallback = '') {
  if (value == null) return fallback;
  return String(value);
}

function metadataCategory(row) {
  const metadata = parseJsonOrNull(row.metadata_json);
  if (metadata && metadata.category) return String(metadata.category);
  return null;
}

function normalizeDirection(amountValue) {
  return Number(amountValue) >= 0 ? 'income' : 'expense';
}

function signedAmount(direction, absoluteAmount) {
  const abs = Math.abs(Number(absoluteAmount) || 0);
  return direction === 'income' ? abs : -abs;
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
  const avg = values.reduce((sum, n) => sum + n, 0) / values.length;
  const variance = values.reduce((sum, n) => sum + (n - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function confidenceLabel(score) {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function slugify(text, maxLen = 56) {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!slug) return 'item';
  return slug.slice(0, maxLen).replace(/_+$/g, '') || 'item';
}

function smallHash(text) {
  let h = 0;
  const token = String(text || '');
  for (let i = 0; i < token.length; i += 1) {
    h = (h * 31 + token.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function candidateKey(accountIdentifier, direction, normalizedDescription) {
  const prefix = slugify(accountIdentifier, 24);
  const body = slugify(normalizedDescription, 40);
  const hash = smallHash(`${accountIdentifier}|${direction}|${normalizedDescription}`);
  return `cand_${prefix}_${direction}_${body}_${hash}`;
}

function projectionProfileRowToApi(row) {
  const metadata = parseJsonOrNull(row.metadata_json);
  return {
    id: row.id,
    profile_key: row.profile_key,
    profile_name: row.profile_name,
    account_identifier: row.account_identifier,
    pattern_type: row.pattern_type,
    direction: row.direction,
    amount_mode: row.amount_mode,
    amount_value: Number(row.amount_value),
    cadence_interval_months: row.cadence_interval_months,
    cadence_interval_days: row.cadence_interval_days,
    day_of_month: row.day_of_month,
    start_date: row.start_date,
    end_date: row.end_date,
    paused: Boolean(row.paused),
    resume_date: row.resume_date,
    linked_profile_key: row.linked_profile_key,
    confidence_label: row.confidence_label,
    confidence_score: Number(row.confidence_score),
    source_type: row.source_type,
    source_note: row.source_note,
    assumption_note: row.assumption_note,
    active: Boolean(row.active),
    metadata,
    override_fields: [
      'amount_value',
      'day_of_month',
      'cadence_interval_months',
      'cadence_interval_days',
      'start_date',
      'end_date',
      'paused',
      'resume_date',
      'assumption_note',
      'active',
      'metadata',
    ],
  };
}

function projectionAnchorRowToApi(row) {
  return {
    id: row.id,
    anchor_key: row.anchor_key,
    account_identifier: row.account_identifier,
    anchor_date: row.anchor_date,
    anchor_transaction_description: row.anchor_transaction_description,
    anchor_transaction_amount: row.anchor_transaction_amount == null ? null : Number(row.anchor_transaction_amount),
    anchor_balance: Number(row.anchor_balance),
    source_type: row.source_type,
    source_note: row.source_note,
    metadata: parseJsonOrNull(row.metadata_json),
    active: Boolean(row.active),
  };
}

async function resolveAccountId(knex, accountIdentifier) {
  const account = await knex('accounts').where({ identifier: accountIdentifier }).first('id');
  return account ? account.id : null;
}

async function upsertAnchorIfMissing(knex, row) {
  const existing = await knex('projection_balance_anchors')
    .where({ anchor_key: row.anchor_key })
    .first('id');
  if (existing) return existing.id;

  const ids = await knex('projection_balance_anchors').insert(row);
  return Array.isArray(ids) && ids.length > 0 ? ids[0] : null;
}

async function insertProfileIfMissing(knex, row) {
  const existing = await knex('projection_profiles').where({ profile_key: row.profile_key }).first('id');
  if (existing) return existing.id;
  const ids = await knex('projection_profiles').insert(row);
  return Array.isArray(ids) && ids.length > 0 ? ids[0] : null;
}

function baseSeedProfiles(accountIdentifier, accountId) {
  const ts = nowEpoch();

  return [
    {
      profile_key: 'income_codeorg_payroll_biweekly_net',
      profile_name: 'Code.org biweekly paycheck (corrected net baseline)',
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'paycheck_cadence',
      direction: 'income',
      amount_mode: 'fixed_amount',
      amount_value: 5417.81,
      cadence_interval_months: 1,
      cadence_interval_days: 14,
      day_of_month: 3,
      start_date: '2026-04-17',
      end_date: null,
      paused: false,
      resume_date: null,
      linked_profile_key: null,
      confidence_label: 'high',
      confidence_score: 0.92,
      source_type: 'prior_todo_output',
      source_note:
        'todo-01 withholding baseline report: corrected-net planning value for remaining 2026 checks',
      assumption_note:
        'Update this profile if payroll net amount or cadence changes.',
      metadata_json: toJsonText({
        category: 'Income',
        gross_paycheck_amount: 6982.69,
        payroll_source: 'CODEORG PAYROLL',
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      profile_key: 'tithing_fast_offering_paycheck_linked',
      profile_name: 'Tithing + fast offering (paycheck-linked)',
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'paycheck_linked_percent_plus_monthly',
      direction: 'expense',
      amount_mode: 'paycheck_percent_plus_monthly_extra',
      amount_value: 0.10,
      cadence_interval_months: 1,
      cadence_interval_days: 14,
      day_of_month: 7,
      start_date: '2026-04-17',
      end_date: null,
      paused: false,
      resume_date: null,
      linked_profile_key: 'income_codeorg_payroll_biweekly_net',
      confidence_label: 'medium',
      confidence_score: 0.7,
      source_type: 'prior_todo_output',
      source_note:
        'todo-03 recurring inventory policy: 10% gross paycheck plus $100 monthly fast offering',
      assumption_note:
        'Uses gross paycheck baseline from todo-01 and monthly extra on day 7.',
      metadata_json: toJsonText({
        category: 'Church Donation',
        paycheck_percent: 0.1,
        paycheck_gross_amount: 6982.69,
        monthly_extra: 100,
        monthly_extra_day: 7,
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      profile_key: 'core_housing_monthly_baseline',
      profile_name: 'Housing baseline (mortgage + rent)',
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'fixed_monthly',
      direction: 'expense',
      amount_mode: 'fixed_amount',
      amount_value: 3872.02,
      cadence_interval_months: 1,
      cadence_interval_days: null,
      day_of_month: 10,
      start_date: '2026-05-01',
      end_date: null,
      paused: false,
      resume_date: null,
      linked_profile_key: null,
      confidence_label: 'high',
      confidence_score: 0.89,
      source_type: 'prior_todo_output',
      source_note: 'todo-02 May rocks forecast (mortgage + rent lane)',
      assumption_note: 'Combined lane for stable monthly housing baseline.',
      metadata_json: toJsonText({
        category: 'Mortgage & Rent',
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      profile_key: 'core_utilities_seasonal_estimate',
      profile_name: 'Utilities seasonal monthly estimate',
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'seasonal_monthly',
      direction: 'expense',
      amount_mode: 'seasonal_month_amount',
      amount_value: 1205,
      cadence_interval_months: 1,
      cadence_interval_days: null,
      day_of_month: 20,
      start_date: '2026-05-01',
      end_date: null,
      paused: false,
      resume_date: null,
      linked_profile_key: null,
      confidence_label: 'medium',
      confidence_score: 0.65,
      source_type: 'prior_todo_output',
      source_note: 'todo-02 May rocks forecast utility component estimate',
      assumption_note: 'Seasonal map can be overridden in todo-12 UI.',
      metadata_json: toJsonText({
        category: 'Bills & Utilities',
        month_amounts: {
          1: 1280,
          2: 1265,
          3: 1215,
          4: 1205,
          5: 1205,
          6: 1170,
          7: 1135,
          8: 1145,
          9: 1185,
          10: 1225,
          11: 1260,
          12: 1295,
        },
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      profile_key: 'required_debt_service_monthly_baseline',
      profile_name: 'Required debt service baseline',
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'fixed_monthly',
      direction: 'expense',
      amount_mode: 'fixed_amount',
      amount_value: 784.04,
      cadence_interval_months: 1,
      cadence_interval_days: null,
      day_of_month: 6,
      start_date: '2026-05-01',
      end_date: null,
      paused: false,
      resume_date: null,
      linked_profile_key: null,
      confidence_label: 'medium',
      confidence_score: 0.66,
      source_type: 'prior_todo_output',
      source_note: 'todo-02 May rocks forecast debt service lane',
      assumption_note: 'Contains student loan + credit/autoloan baseline estimate.',
      metadata_json: toJsonText({
        category: 'Education',
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      profile_key: 'parent_plus_monthly_start_2026_06',
      profile_name: 'Parent PLUS loan payment',
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'fixed_monthly',
      direction: 'expense',
      amount_mode: 'fixed_amount',
      amount_value: 100,
      cadence_interval_months: 1,
      cadence_interval_days: null,
      day_of_month: 1,
      start_date: '2026-06-01',
      end_date: null,
      paused: false,
      resume_date: null,
      linked_profile_key: null,
      confidence_label: 'medium',
      confidence_score: 0.6,
      source_type: 'supervisor_seed',
      source_note: 'supervisor prompt 2026-04-25: new $100/month payment starts June 1, 2026',
      assumption_note: 'No historical transaction yet; explicit supervisor seed.',
      metadata_json: toJsonText({
        category: 'Education',
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      profile_key: 'double_oven_event_2026_05_15',
      profile_name: 'Double oven planned event',
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'one_time',
      direction: 'expense',
      amount_mode: 'fixed_amount',
      amount_value: 2500,
      cadence_interval_months: 1,
      cadence_interval_days: null,
      day_of_month: 15,
      start_date: '2026-05-15',
      end_date: '2026-05-15',
      paused: false,
      resume_date: null,
      linked_profile_key: null,
      confidence_label: 'medium',
      confidence_score: 0.58,
      source_type: 'supervisor_seed',
      source_note: 'supervisor prompt 2026-04-25: model $2,500 around 2026-05-15',
      assumption_note: 'One-time event seed for scenario planning.',
      metadata_json: toJsonText({
        category: 'Home Improvement',
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      profile_key: 'family_vacation_event_2026_07_01',
      profile_name: 'Family vacation planned event',
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'one_time',
      direction: 'expense',
      amount_mode: 'fixed_amount',
      amount_value: 2000,
      cadence_interval_months: 1,
      cadence_interval_days: null,
      day_of_month: 1,
      start_date: '2026-07-01',
      end_date: '2026-07-01',
      paused: false,
      resume_date: null,
      linked_profile_key: null,
      confidence_label: 'medium',
      confidence_score: 0.58,
      source_type: 'supervisor_seed',
      source_note: 'supervisor prompt 2026-04-25: model $2,000 around 2026-07-01',
      assumption_note: 'One-time event seed for scenario planning.',
      metadata_json: toJsonText({
        category: 'Travel',
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    },
  ];
}

async function seedEdwardJonesPausedProfiles(knex, accountIdentifier, accountId) {
  const rows = await knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .where('accounts.identifier', accountIdentifier)
    .where('transactions.amount', '<', 0)
    .where('transactions.date', '>=', '2026-01-01')
    .whereRaw('lower(transactions.description) like ?', ['%edward jones investment%'])
    .select(
      'transactions.id',
      'transactions.date',
      'transactions.description',
      'transactions.amount'
    )
    .orderBy('transactions.date', 'asc')
    .orderBy('transactions.id', 'asc');

  const ts = nowEpoch();

  if (!rows.length) {
    const placeholder = {
      profile_key: 'edward_jones_paused_placeholder',
      profile_name: 'Edward Jones transfer placeholder (paused)',
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'paused_transfer',
      direction: 'expense',
      amount_mode: 'fixed_amount',
      amount_value: 2033,
      cadence_interval_months: 1,
      cadence_interval_days: null,
      day_of_month: 1,
      start_date: '2026-04-01',
      end_date: null,
      paused: true,
      resume_date: null,
      linked_profile_key: null,
      confidence_label: 'low',
      confidence_score: 0.3,
      source_type: 'manual_placeholder',
      source_note:
        'No historical Edward Jones debit rows found during seeding; placeholder retained for manual resume-date modeling.',
      assumption_note: 'Set explicit resume_date when transfer should restart.',
      metadata_json: toJsonText({ category: 'Retirement' }),
      active: true,
      created_at: ts,
      updated_at: ts,
    };
    await insertProfileIfMissing(knex, placeholder);
    return;
  }

  for (const row of rows) {
    const absAmount = Math.abs(Number(row.amount) || 0);
    if (!Number.isFinite(absAmount) || absAmount <= 0) continue;

    const transferDate = safeDateToken(row.date);
    const transferDay = dayOfMonth(transferDate);
    const amountCents = Math.round(absAmount * 100);
    const profileKey = `edward_jones_paused_${transferDate}_${amountCents}`;

    const profileRow = {
      profile_key: profileKey,
      profile_name: `Edward Jones transfer template ${transferDate} ($${absAmount.toFixed(2)})`,
      account_id: accountId,
      account_identifier: accountIdentifier,
      pattern_type: 'paused_transfer',
      direction: 'expense',
      amount_mode: 'fixed_amount',
      amount_value: round2(absAmount),
      cadence_interval_months: 1,
      cadence_interval_days: null,
      day_of_month: transferDay,
      start_date: transferDate,
      end_date: null,
      paused: true,
      resume_date: null,
      linked_profile_key: null,
      confidence_label: 'medium',
      confidence_score: 0.7,
      source_type: 'inferred_history',
      source_note: `inferred from transaction history row id ${row.id}`,
      assumption_note:
        'Supervisor marked Edward Jones transfers paused; set resume_date when testing restart scenarios.',
      metadata_json: toJsonText({
        category: 'Retirement',
        historical_reference: {
          transaction_id: row.id,
          date: transferDate,
          description: safeText(row.description),
        },
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    };

    await insertProfileIfMissing(knex, profileRow);
  }
}

async function ensureProjectionSeedData(knex, accountIdentifier = DEFAULT_ACCOUNT_IDENTIFIER) {
  const cacheKey = String(accountIdentifier);
  if (SEEDED_ACCOUNTS.has(cacheKey)) {
    return {
      account_identifier: accountIdentifier,
      seeded: false,
    };
  }

  const accountId = await resolveAccountId(knex, accountIdentifier);
  const ts = nowEpoch();

  if (accountIdentifier === 'Ally_Bank') {
    await upsertAnchorIfMissing(knex, {
      anchor_key: 'ally_april_2026_supervisor_anchor',
      account_id: accountId,
      account_identifier: accountIdentifier,
      anchor_date: '2026-04-01',
      anchor_transaction_description:
        'EDWARD JONES INVESTMENT debit $525; supervisor anchor says balance was $1,919.76 immediately after this transaction.',
      anchor_transaction_amount: -525,
      anchor_balance: 1919.76,
      source_type: 'supervisor_seed',
      source_note: 'supervisor prompt 2026-04-25 (todo-11)',
      metadata_json: toJsonText({
        anchor_context:
          'Use as canonical planning anchor unless reconciliation proves the transaction cannot be located.',
      }),
      active: true,
      created_at: ts,
      updated_at: ts,
    });
  }

  const seeds = baseSeedProfiles(accountIdentifier, accountId);
  for (const profile of seeds) {
    await insertProfileIfMissing(knex, profile);
  }

  await seedEdwardJonesPausedProfiles(knex, accountIdentifier, accountId);
  SEEDED_ACCOUNTS.add(cacheKey);

  return {
    account_identifier: accountIdentifier,
    seeded: true,
  };
}

function resolveAccountIdentifierFromSearch(searchParams) {
  const raw = searchParams.get('account');
  return raw && String(raw).trim() ? String(raw).trim() : DEFAULT_ACCOUNT_IDENTIFIER;
}

async function listProjectionProfiles(knex, searchParams) {
  const accountIdentifier = resolveAccountIdentifierFromSearch(searchParams);
  await ensureProjectionSeedData(knex, accountIdentifier);

  const includeInactive = asBool(searchParams.get('include_inactive'), false);

  let query = knex('projection_profiles')
    .where({ account_identifier: accountIdentifier })
    .orderBy('active', 'desc')
    .orderBy('pattern_type', 'asc')
    .orderBy('profile_name', 'asc');

  if (!includeInactive) {
    query = query.andWhere('active', 1);
  }

  const rows = await query;

  return {
    account_identifier: accountIdentifier,
    sign_convention: SIGN_CONVENTION,
    profiles: rows.map(projectionProfileRowToApi),
  };
}

async function listProjectionAnchors(knex, searchParams) {
  const accountIdentifier = resolveAccountIdentifierFromSearch(searchParams);
  await ensureProjectionSeedData(knex, accountIdentifier);

  const includeInactive = asBool(searchParams.get('include_inactive'), false);

  let query = knex('projection_balance_anchors')
    .where({ account_identifier: accountIdentifier })
    .orderBy('active', 'desc')
    .orderBy('anchor_date', 'desc')
    .orderBy('id', 'desc');

  if (!includeInactive) {
    query = query.andWhere('active', 1);
  }

  const rows = await query;

  return {
    account_identifier: accountIdentifier,
    anchors: rows.map(projectionAnchorRowToApi),
  };
}

function inferCadencePattern(monthKeys) {
  if (!Array.isArray(monthKeys) || monthKeys.length < 2) {
    return {
      pattern_type: 'one_time',
      cadence_interval_months: 1,
      regularity: 0,
    };
  }

  const sortedKeys = [...monthKeys].sort((a, b) => a.localeCompare(b));
  const diffs = [];
  for (let i = 1; i < sortedKeys.length; i += 1) {
    diffs.push(monthDiff(sortedKeys[i - 1], sortedKeys[i]));
  }

  if (!diffs.length) {
    return {
      pattern_type: 'one_time',
      cadence_interval_months: 1,
      regularity: 0,
    };
  }

  const counts = new Map();
  for (const diff of diffs) {
    counts.set(diff, (counts.get(diff) || 0) + 1);
  }

  let bestDiff = 1;
  let bestCount = 0;
  for (const [diff, count] of counts.entries()) {
    if (count > bestCount) {
      bestDiff = diff;
      bestCount = count;
    }
  }

  const regularity = bestCount / diffs.length;

  if (bestDiff <= 1) {
    return {
      pattern_type: 'fixed_monthly',
      cadence_interval_months: 1,
      regularity,
    };
  }

  if (bestDiff === 2) {
    return {
      pattern_type: 'every_n_months',
      cadence_interval_months: 2,
      regularity,
    };
  }

  return {
    pattern_type: 'seasonal_monthly',
    cadence_interval_months: Math.max(1, bestDiff),
    regularity,
  };
}

function buildProfileNameFromNormalized(normalizedDescription, direction) {
  const cleaned = safeText(normalizedDescription)
    .replace(/\s+/g, ' ')
    .trim();

  const clipped = cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
  const prefix = direction === 'income' ? 'Inferred income' : 'Inferred recurring expense';
  return `${prefix}: ${clipped || 'unnamed pattern'}`;
}

async function gatherInferenceRows(knex, accountIdentifier, fromDate, toDate) {
  const linkedTargets = await knex('transactions')
    .whereNotNull('linked_transaction_id')
    .pluck('linked_transaction_id');

  const linkedSet = new Set((linkedTargets || []).filter((value) => value != null));

  let query = knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .leftJoin('parse_formats', 'parse_formats.id', 'accounts.parse_format_id')
    .where('accounts.identifier', accountIdentifier)
    .whereBetween('transactions.date', [fromDate, toDate])
    .whereNull('transactions.linked_transaction_id')
    .select(
      'transactions.id',
      'transactions.account_id',
      'transactions.date',
      'transactions.description',
      'transactions.amount',
      'accounts.identifier as account_identifier',
      'parse_formats.identifier as parse_format_identifier'
    )
    .orderBy('transactions.date', 'asc')
    .orderBy('transactions.id', 'asc');

  if (linkedSet.size > 0) {
    query = query.whereNotIn('transactions.id', [...linkedSet]);
  }

  return query;
}

async function resolveInferenceWindow(knex, accountIdentifier, searchParams) {
  const requestedStart = searchParams.get('start_month');
  const requestedEnd = searchParams.get('end_month');

  if (requestedStart || requestedEnd) {
    const endMonth = requestedEnd ? parseMonthKey(requestedEnd).key : parseMonthKey(requestedStart).key;
    const startMonth = requestedStart ? parseMonthKey(requestedStart).key : endMonth;

    if (compareMonthKeys(startMonth, endMonth) > 0) {
      throw new Error(`Invalid range: ${startMonth} is after ${endMonth}.`);
    }

    return {
      start_month: startMonth,
      end_month: endMonth,
      from: `${startMonth}-01`,
      to: lastDayOfMonth(parseMonthKey(endMonth).year, parseMonthKey(endMonth).month),
    };
  }

  const latestRow = await knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .where('accounts.identifier', accountIdentifier)
    .max({ max_date: 'transactions.date' })
    .first();

  if (!latestRow || !latestRow.max_date) {
    const now = new Date();
    const currentMonth = toMonthKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
    return {
      start_month: currentMonth,
      end_month: currentMonth,
      from: `${currentMonth}-01`,
      to: lastDayOfMonth(now.getUTCFullYear(), now.getUTCMonth() + 1),
    };
  }

  const endMonth = monthKeyFromDate(latestRow.max_date);
  const startMonth = shiftMonthKey(endMonth, -11);

  return {
    start_month: startMonth,
    end_month: endMonth,
    from: `${startMonth}-01`,
    to: lastDayOfMonth(parseMonthKey(endMonth).year, parseMonthKey(endMonth).month),
  };
}

async function refreshInferredCandidates(knex, searchParams) {
  const accountIdentifier = resolveAccountIdentifierFromSearch(searchParams);
  await ensureProjectionSeedData(knex, accountIdentifier);

  const accountId = await resolveAccountId(knex, accountIdentifier);
  const limit = clamp(
    Math.floor(asNumber(searchParams.get('limit'), MAX_CANDIDATES)),
    1,
    MAX_CANDIDATES
  );

  const window = await resolveInferenceWindow(knex, accountIdentifier, searchParams);
  const rows = await gatherInferenceRows(knex, accountIdentifier, window.from, window.to);

  const accountFormatCache = new Map();
  const groups = new Map();

  for (const row of rows) {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount === 0) continue;

    let formatId = row.parse_format_identifier;
    if (!formatId) {
      if (accountFormatCache.has(row.account_id)) {
        formatId = accountFormatCache.get(row.account_id);
      } else {
        formatId = await resolveFormatIdentifier(knex, row.account_id);
        accountFormatCache.set(row.account_id, formatId);
      }
    }

    const rawDescription = safeText(row.description);
    const parser = getParser(formatId);
    const normalizedDescription = parser
      ? parser.normalize(rawDescription)
      : rawDescription.trim().toLowerCase();

    if (!normalizedDescription) continue;

    const direction = normalizeDirection(amount);
    const groupKey = `${direction}|${normalizedDescription}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        direction,
        normalized_description: normalizedDescription,
        amounts_abs: [],
        days_of_month: [],
        month_keys: new Set(),
        first_seen_date: row.date,
        last_seen_date: row.date,
        transaction_count: 0,
        sample_transactions: [],
      });
    }

    const group = groups.get(groupKey);
    const absAmount = Math.abs(amount);

    group.amounts_abs.push(absAmount);
    group.days_of_month.push(dayOfMonth(row.date));
    group.month_keys.add(monthKeyFromDate(row.date));
    group.transaction_count += 1;

    if (compareDates(row.date, group.first_seen_date) < 0) {
      group.first_seen_date = row.date;
    }
    if (compareDates(row.date, group.last_seen_date) > 0) {
      group.last_seen_date = row.date;
    }

    if (group.sample_transactions.length < 5) {
      group.sample_transactions.push({
        id: row.id,
        date: row.date,
        amount,
        description: rawDescription,
      });
    }
  }

  const ts = nowEpoch();
  const candidateRows = [];

  for (const group of groups.values()) {
    const monthKeys = [...group.month_keys].sort((a, b) => a.localeCompare(b));
    if (group.transaction_count < 3 || monthKeys.length < 3) continue;

    const cadence = inferCadencePattern(monthKeys);
    const amountMedian = median(group.amounts_abs);
    const amountSd = standardDeviation(group.amounts_abs);
    const cv = amountMedian > 0 ? amountSd / amountMedian : 1;
    const stability = clamp(1 - cv, 0, 1);
    const monthsCoverage = clamp(monthKeys.length / 12, 0, 1);

    const confidenceScore = round2(
      clamp(monthsCoverage * 0.45 + cadence.regularity * 0.35 + stability * 0.2, 0.05, 0.99)
    );

    const label = confidenceLabel(confidenceScore);
    const medianDay = Math.round(median(group.days_of_month));

    candidateRows.push({
      candidate_key: candidateKey(
        accountIdentifier,
        group.direction,
        group.normalized_description
      ),
      account_id: accountId,
      account_identifier: accountIdentifier,
      normalized_description: group.normalized_description,
      profile_name: buildProfileNameFromNormalized(
        group.normalized_description,
        group.direction
      ),
      direction: group.direction,
      pattern_type: cadence.pattern_type,
      cadence_interval_months: cadence.cadence_interval_months,
      day_of_month: clamp(medianDay || 1, 1, 31),
      amount_estimate: round2(amountMedian),
      transactions_observed: group.transaction_count,
      months_observed: monthKeys.length,
      first_seen_date: group.first_seen_date,
      last_seen_date: group.last_seen_date,
      confidence_label: label,
      confidence_score: confidenceScore,
      source_type: 'inferred_history',
      source_note: `inferred from ${group.transaction_count} transactions in ${monthKeys.length} months`,
      metadata_json: toJsonText({
        range: window,
        cadence_regularity: round2(cadence.regularity),
        amount_cv: round2(cv),
        observed_month_keys: monthKeys,
        sample_transactions: group.sample_transactions,
      }),
      created_at: ts,
      updated_at: ts,
    });
  }

  candidateRows.sort((left, right) => {
    if (right.confidence_score !== left.confidence_score) {
      return right.confidence_score - left.confidence_score;
    }
    if (right.months_observed !== left.months_observed) {
      return right.months_observed - left.months_observed;
    }
    return left.profile_name.localeCompare(right.profile_name);
  });

  const limitedRows = candidateRows.slice(0, limit);

  await knex.transaction(async (trx) => {
    await trx('projection_profile_candidates')
      .where({ account_identifier: accountIdentifier })
      .del();

    if (limitedRows.length > 0) {
      await trx('projection_profile_candidates').insert(limitedRows);
    }
  });

  return {
    account_identifier: accountIdentifier,
    inference_window: window,
    candidate_count: limitedRows.length,
    candidates: limitedRows.map((row) => ({
      candidate_key: row.candidate_key,
      profile_name: row.profile_name,
      normalized_description: row.normalized_description,
      direction: row.direction,
      pattern_type: row.pattern_type,
      cadence_interval_months: row.cadence_interval_months,
      day_of_month: row.day_of_month,
      amount_estimate: row.amount_estimate,
      transactions_observed: row.transactions_observed,
      months_observed: row.months_observed,
      confidence_label: row.confidence_label,
      confidence_score: row.confidence_score,
      source_type: row.source_type,
      source_note: row.source_note,
      metadata: parseJsonOrNull(row.metadata_json),
    })),
  };
}

async function listInferredCandidates(knex, searchParams) {
  const accountIdentifier = resolveAccountIdentifierFromSearch(searchParams);
  await ensureProjectionSeedData(knex, accountIdentifier);

  const refresh = asBool(searchParams.get('refresh'), false);

  if (refresh) {
    return refreshInferredCandidates(knex, searchParams);
  }

  let rows = await knex('projection_profile_candidates')
    .where({ account_identifier: accountIdentifier })
    .orderBy('confidence_score', 'desc')
    .orderBy('months_observed', 'desc')
    .orderBy('profile_name', 'asc');

  if (!rows.length) {
    await refreshInferredCandidates(knex, searchParams);
    rows = await knex('projection_profile_candidates')
      .where({ account_identifier: accountIdentifier })
      .orderBy('confidence_score', 'desc')
      .orderBy('months_observed', 'desc')
      .orderBy('profile_name', 'asc');
  }

  return {
    account_identifier: accountIdentifier,
    candidate_count: rows.length,
    candidates: rows.map((row) => ({
      candidate_key: row.candidate_key,
      profile_name: row.profile_name,
      normalized_description: row.normalized_description,
      direction: row.direction,
      pattern_type: row.pattern_type,
      cadence_interval_months: row.cadence_interval_months,
      day_of_month: row.day_of_month,
      amount_estimate: Number(row.amount_estimate),
      transactions_observed: row.transactions_observed,
      months_observed: row.months_observed,
      first_seen_date: row.first_seen_date,
      last_seen_date: row.last_seen_date,
      confidence_label: row.confidence_label,
      confidence_score: Number(row.confidence_score),
      source_type: row.source_type,
      source_note: row.source_note,
      metadata: parseJsonOrNull(row.metadata_json),
    })),
  };
}

function resolveForecastWindow(searchParams) {
  const now = new Date();
  const defaultStart = toMonthKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const startMonth = searchParams.get('start_month')
    ? parseMonthKey(searchParams.get('start_month')).key
    : defaultStart;

  const months = clamp(
    Math.floor(asNumber(searchParams.get('months'), DEFAULT_FORECAST_MONTHS)),
    1,
    MAX_FORECAST_MONTHS
  );

  const endMonth = shiftMonthKey(startMonth, months - 1);
  const monthKeys = enumerateMonthKeys(startMonth, endMonth);

  return {
    start_month: startMonth,
    end_month: endMonth,
    months,
    month_keys: monthKeys,
    from: dateFromMonthKey(startMonth),
    to: lastDayOfMonth(parseMonthKey(endMonth).year, parseMonthKey(endMonth).month),
  };
}

async function resolveAnchor(knex, accountIdentifier, forecastWindow) {
  const anchor = await knex('projection_balance_anchors')
    .where({ account_identifier: accountIdentifier, active: 1 })
    .andWhere('anchor_date', '<=', forecastWindow.from)
    .orderBy('anchor_date', 'desc')
    .orderBy('id', 'desc')
    .first();

  if (anchor) return anchor;

  return knex('projection_balance_anchors')
    .where({ account_identifier: accountIdentifier, active: 1 })
    .orderBy('anchor_date', 'desc')
    .orderBy('id', 'desc')
    .first();
}

function profileIsDateEligible(profile, dateValue, forecastWindow) {
  if (!withinDateRange(dateValue, forecastWindow.from, forecastWindow.to)) return false;
  if (compareDates(dateValue, profile.start_date) < 0) return false;
  if (profile.end_date && compareDates(dateValue, profile.end_date) > 0) return false;
  return true;
}

function profileHasResumeConstraint(profile, dateValue) {
  if (!profile.paused) return false;
  if (!profile.resume_date) return true;
  return compareDates(dateValue, profile.resume_date) < 0;
}

function buildPausedNoticeEvent(profile, dateValue) {
  return {
    date: dateValue,
    profile_id: profile.id,
    profile_key: profile.profile_key,
    profile_name: profile.profile_name,
    pattern_type: profile.pattern_type,
    direction: profile.direction,
    amount: 0,
    amount_abs: 0,
    category: metadataCategory(profile),
    source_type: profile.source_type,
    source_note: profile.source_note,
    confidence_label: profile.confidence_label,
    confidence_score: Number(profile.confidence_score),
    assumption_note: profile.assumption_note,
    row_type: 'paused_profile_notice',
    is_non_cash: true,
    status: 'paused_no_resume_date',
    account_identifier: profile.account_identifier,
  };
}

function buildCashEvent(profile, dateValue, absoluteAmount, rowType = 'forecast') {
  const amount = signedAmount(profile.direction, absoluteAmount);
  return {
    date: dateValue,
    profile_id: profile.id,
    profile_key: profile.profile_key,
    profile_name: profile.profile_name,
    pattern_type: profile.pattern_type,
    direction: profile.direction,
    amount: round2(amount),
    amount_abs: round2(Math.abs(amount)),
    category: metadataCategory(profile),
    source_type: profile.source_type,
    source_note: profile.source_note,
    confidence_label: profile.confidence_label,
    confidence_score: Number(profile.confidence_score),
    assumption_note: profile.assumption_note,
    row_type: rowType,
    is_non_cash: false,
    status: 'scheduled',
    account_identifier: profile.account_identifier,
  };
}

function amountForSeasonalProfile(profile, monthKey) {
  const metadata = parseJsonOrNull(profile.metadata_json) || {};
  const map = metadata.month_amounts || {};
  const monthNumber = Number(monthKey.slice(5, 7));

  if (map[monthNumber] != null) {
    const amount = Number(map[monthNumber]);
    if (Number.isFinite(amount)) return Math.abs(amount);
  }
  if (map[String(monthNumber)] != null) {
    const amount = Number(map[String(monthNumber)]);
    if (Number.isFinite(amount)) return Math.abs(amount);
  }

  return Math.abs(Number(profile.amount_value) || 0);
}

function generateNonLinkedProfileEvents(profile, forecastWindow) {
  const events = [];

  if (!profile.active) return events;

  if (profile.pattern_type === 'one_time') {
    const eventDate = safeDateToken(profile.start_date);
    if (!profileIsDateEligible(profile, eventDate, forecastWindow)) return events;

    if (profileHasResumeConstraint(profile, eventDate)) {
      events.push(buildPausedNoticeEvent(profile, eventDate));
      return events;
    }

    events.push(buildCashEvent(profile, eventDate, Math.abs(Number(profile.amount_value) || 0)));
    return events;
  }

  if (profile.pattern_type === 'paycheck_cadence') {
    const intervalDays = clamp(Number(profile.cadence_interval_days) || 14, 1, 45);
    let cursor = safeDateToken(profile.start_date);
    let loops = 0;

    while (compareDates(cursor, forecastWindow.from) < 0 && loops < 400) {
      cursor = addDays(cursor, intervalDays);
      loops += 1;
    }

    loops = 0;
    while (compareDates(cursor, forecastWindow.to) <= 0 && loops < 400) {
      if (profileIsDateEligible(profile, cursor, forecastWindow)) {
        if (profileHasResumeConstraint(profile, cursor)) {
          if (!profile.resume_date) {
            events.push(buildPausedNoticeEvent(profile, cursor));
            break;
          }
        } else {
          events.push(buildCashEvent(profile, cursor, Math.abs(Number(profile.amount_value) || 0)));
        }
      }
      cursor = addDays(cursor, intervalDays);
      loops += 1;
    }

    return events;
  }

  const profileStartMonth = monthKeyFromDate(profile.start_date);
  const day = clamp(
    Number(profile.day_of_month) || dayOfMonth(profile.start_date),
    1,
    31
  );
  const intervalMonths = clamp(Number(profile.cadence_interval_months) || 1, 1, 24);

  for (const monthKey of forecastWindow.month_keys) {
    if (compareMonthKeys(monthKey, profileStartMonth) < 0) continue;

    if (profile.pattern_type === 'every_n_months') {
      if (monthDiff(profileStartMonth, monthKey) % intervalMonths !== 0) continue;
    }

    const eventDate = clampDayInMonth(monthKey, day);
    if (!profileIsDateEligible(profile, eventDate, forecastWindow)) continue;

    if (profileHasResumeConstraint(profile, eventDate)) {
      if (profile.pattern_type === 'paused_transfer' && !profile.resume_date) {
        events.push(buildPausedNoticeEvent(profile, eventDate));
      }
      continue;
    }

    let amountAbs = Math.abs(Number(profile.amount_value) || 0);
    if (profile.pattern_type === 'seasonal_monthly') {
      amountAbs = amountForSeasonalProfile(profile, monthKey);
    }

    events.push(buildCashEvent(profile, eventDate, amountAbs));
  }

  return events;
}

function buildFallbackPaycheckDates(profile, forecastWindow) {
  const dates = [];
  const intervalDays = clamp(Number(profile.cadence_interval_days) || 14, 1, 45);
  let cursor = safeDateToken(profile.start_date);
  let loops = 0;

  while (compareDates(cursor, forecastWindow.from) < 0 && loops < 400) {
    cursor = addDays(cursor, intervalDays);
    loops += 1;
  }

  loops = 0;
  while (compareDates(cursor, forecastWindow.to) <= 0 && loops < 400) {
    if (profileIsDateEligible(profile, cursor, forecastWindow)) {
      dates.push(cursor);
    }
    cursor = addDays(cursor, intervalDays);
    loops += 1;
  }

  return dates;
}

function generatePaycheckLinkedEvents(profile, forecastWindow, baseEventsByProfile) {
  const events = [];
  if (!profile.active) return events;

  const metadata = parseJsonOrNull(profile.metadata_json) || {};
  const linkedKey = profile.linked_profile_key;

  let paycheckDates = [];
  if (linkedKey && Array.isArray(baseEventsByProfile.get(linkedKey))) {
    paycheckDates = baseEventsByProfile
      .get(linkedKey)
      .filter((row) => !row.is_non_cash && row.direction === 'income')
      .map((row) => row.date);
  }

  if (!paycheckDates.length) {
    paycheckDates = buildFallbackPaycheckDates(profile, forecastWindow);
  }

  const paycheckPercent = Number(
    metadata.paycheck_percent != null ? metadata.paycheck_percent : profile.amount_value
  );
  const grossPerCheck = Number(metadata.paycheck_gross_amount);

  for (const paycheckDate of paycheckDates) {
    if (!profileIsDateEligible(profile, paycheckDate, forecastWindow)) continue;
    if (profileHasResumeConstraint(profile, paycheckDate)) continue;

    const baseForPercent = Number.isFinite(grossPerCheck) && grossPerCheck > 0
      ? grossPerCheck
      : 0;
    const absAmount = Math.abs((baseForPercent || 0) * paycheckPercent);
    if (absAmount > 0) {
      events.push(buildCashEvent(profile, paycheckDate, absAmount, 'paycheck_linked'));
    }
  }

  const monthlyExtra = Number(metadata.monthly_extra);
  if (Number.isFinite(monthlyExtra) && monthlyExtra > 0) {
    const monthlyDay = clamp(
      Number(metadata.monthly_extra_day || profile.day_of_month || 7),
      1,
      31
    );

    for (const monthKey of forecastWindow.month_keys) {
      const eventDate = clampDayInMonth(monthKey, monthlyDay);
      if (!profileIsDateEligible(profile, eventDate, forecastWindow)) continue;
      if (profileHasResumeConstraint(profile, eventDate)) continue;
      events.push(buildCashEvent(profile, eventDate, monthlyExtra, 'monthly_extra'));
    }
  }

  return events;
}

function summarizeForecastRows(rows) {
  const monthMap = new Map();

  for (const row of rows) {
    const monthKey = monthKeyFromDate(row.date);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month_key: monthKey,
        income_total: 0,
        expense_total: 0,
        non_cash_rows: 0,
        net_total: 0,
        ending_balance: null,
      });
    }

    const month = monthMap.get(monthKey);
    if (row.is_non_cash) {
      month.non_cash_rows += 1;
      month.ending_balance = row.running_balance;
      continue;
    }

    if (row.amount >= 0) {
      month.income_total += row.amount;
    } else {
      month.expense_total += row.amount;
    }
    month.net_total += row.amount;
    month.ending_balance = row.running_balance;
  }

  return [...monthMap.values()]
    .sort((a, b) => a.month_key.localeCompare(b.month_key))
    .map((row) => ({
      month_key: row.month_key,
      income_total: round2(row.income_total),
      expense_total: round2(row.expense_total),
      net_total: round2(row.net_total),
      non_cash_rows: row.non_cash_rows,
      ending_balance: row.ending_balance == null ? null : round2(row.ending_balance),
    }));
}

async function resolveLatestTransactionMonth(knex, accountIdentifier) {
  const latest = await knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .where('accounts.identifier', accountIdentifier)
    .max({ max_date: 'transactions.date' })
    .first();

  if (!latest || !latest.max_date) return null;
  return monthKeyFromDate(latest.max_date);
}

function monthWindowFromMonthKey(monthKey) {
  const parsed = parseMonthKey(monthKey);
  const from = `${parsed.key}-01`;
  const to = lastDayOfMonth(parsed.year, parsed.month);
  return {
    year: parsed.year,
    month: parsed.month,
    from,
    to,
    label: `${from} … ${to}`,
  };
}

async function resolveCategoryDefaultWindow(knex, accountIdentifier, forecastWindow, windowRequest = {}) {
  const rawLookback = windowRequest.lookback_months;
  const lookbackMonths = clamp(
    Math.floor(asNumber(rawLookback, DEFAULT_CATEGORY_LOOKBACK_MONTHS)),
    1,
    MAX_CATEGORY_LOOKBACK_MONTHS
  );

  const requestedStart = windowRequest.start_month
    ? parseMonthKey(windowRequest.start_month).key
    : null;
  const requestedEnd = windowRequest.end_month ? parseMonthKey(windowRequest.end_month).key : null;

  let startMonth;
  let endMonth;

  if (requestedStart || requestedEnd) {
    startMonth = requestedStart || requestedEnd;
    endMonth = requestedEnd || requestedStart;
  } else {
    const latestMonth = await resolveLatestTransactionMonth(knex, accountIdentifier);
    const referenceMonth = forecastWindow
      ? shiftMonthKey(forecastWindow.start_month, -1)
      : latestMonth || toMonthKey(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1);

    if (latestMonth && compareMonthKeys(referenceMonth, latestMonth) > 0) {
      endMonth = latestMonth;
    } else {
      endMonth = referenceMonth;
    }

    startMonth = shiftMonthKey(endMonth, -(lookbackMonths - 1));
  }

  if (compareMonthKeys(startMonth, endMonth) > 0) {
    throw new Error(`Invalid category window: ${startMonth} is after ${endMonth}.`);
  }

  const monthKeys = enumerateMonthKeys(startMonth, endMonth);
  const parsedEnd = parseMonthKey(endMonth);

  return {
    start_month: startMonth,
    end_month: endMonth,
    month_count: monthKeys.length,
    month_keys: monthKeys,
    from: dateFromMonthKey(startMonth),
    to: lastDayOfMonth(parsedEnd.year, parsedEnd.month),
    lookback_months: lookbackMonths,
  };
}

async function buildCategoryDefaultsForWindow(knex, categoryWindow) {
  const monthKeys = categoryWindow.month_keys;
  const aggregates = new Map();

  for (const monthKey of monthKeys) {
    const monthWindow = monthWindowFromMonthKey(monthKey);
    const report = await fetchMonthBucketData(knex, monthWindow, {
      includeLinked: false,
    });

    for (const bucket of report.buckets) {
      if (!aggregates.has(bucket.bucket)) {
        aggregates.set(bucket.bucket, {
          category: bucket.bucket,
          month_totals: new Map(),
          transaction_count: 0,
        });
      }

      const agg = aggregates.get(bucket.bucket);
      agg.month_totals.set(monthKey, Number(bucket.total_amount) || 0);
      agg.transaction_count += Number(bucket.transaction_count) || 0;
    }
  }

  const categories = [];

  for (const agg of aggregates.values()) {
    const monthlySignedTotals = monthKeys.map((monthKey) =>
      round2(agg.month_totals.has(monthKey) ? agg.month_totals.get(monthKey) : 0)
    );
    const signedAverage = round2(
      monthlySignedTotals.reduce((sum, value) => sum + value, 0) / monthKeys.length
    );

    if (signedAverage >= 0) continue;

    const monthsWithActivity = monthlySignedTotals.filter((value) => value !== 0).length;
    const defaultMonthlyAmount = round2(Math.abs(signedAverage));

    if (defaultMonthlyAmount <= 0) continue;

    categories.push({
      category: agg.category,
      direction: 'expense',
      default_monthly_amount: defaultMonthlyAmount,
      average_signed_monthly_total: signedAverage,
      months_with_activity: monthsWithActivity,
      transaction_count: agg.transaction_count,
      month_totals: monthKeys.map((monthKey, index) => ({
        month_key: monthKey,
        signed_total: monthlySignedTotals[index],
      })),
    });
  }

  categories.sort((left, right) => {
    if (right.default_monthly_amount !== left.default_monthly_amount) {
      return right.default_monthly_amount - left.default_monthly_amount;
    }
    return left.category.localeCompare(right.category);
  });

  return categories;
}

async function loadCategoryDefaults(knex, accountIdentifier, forecastWindow, windowRequest = {}) {
  const categoryWindow = await resolveCategoryDefaultWindow(
    knex,
    accountIdentifier,
    forecastWindow,
    windowRequest
  );
  const categories = await buildCategoryDefaultsForWindow(knex, categoryWindow);

  return {
    account_identifier: accountIdentifier,
    category_window: categoryWindow,
    categories,
  };
}

async function listProjectionCategoryDefaults(knex, searchParams) {
  const accountIdentifier = resolveAccountIdentifierFromSearch(searchParams);
  await ensureProjectionSeedData(knex, accountIdentifier);

  const forecastStartMonth = searchParams.get('forecast_start_month');
  const forecastParams = new URLSearchParams(searchParams.toString());
  if (forecastStartMonth) {
    forecastParams.set('start_month', parseMonthKey(forecastStartMonth).key);
  }
  const forecastWindow = resolveForecastWindow(forecastParams);

  const categoryWindowRequest = {
    start_month: searchParams.get('category_start_month'),
    end_month: searchParams.get('category_end_month'),
    lookback_months: searchParams.get('lookback_months'),
  };

  return loadCategoryDefaults(knex, accountIdentifier, forecastWindow, categoryWindowRequest);
}

function parseScenarioOverridesFromSearch(searchParams) {
  let raw = null;
  const token = searchParams.get('scenario_overrides');
  if (token && String(token).trim()) {
    try {
      raw = JSON.parse(token);
    } catch (_err) {
      throw new Error('scenario_overrides must be valid JSON.');
    }
  }

  if (raw == null) raw = {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('scenario_overrides must be a JSON object.');
  }

  const anchorBalance = searchParams.get('anchor_balance_override');
  if (anchorBalance != null && anchorBalance !== '') {
    raw.anchor_balance_override = anchorBalance;
  }

  const warningBalance = searchParams.get('warning_balance_threshold');
  if (warningBalance != null && warningBalance !== '') {
    raw.warning_balance_threshold = warningBalance;
  }

  return raw;
}

function normalizeScenarioOverrides(rawOverrides) {
  const raw = rawOverrides == null ? {} : rawOverrides;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('scenario_overrides must be a JSON object.');
  }

  const allowedTopLevel = new Set([
    'anchor_balance_override',
    'anchor_balance',
    'warning_balance_threshold',
    'low_balance_warning_threshold',
    'profile_overrides',
    'category_overrides',
    'category_default_window',
    'category_adjustment_day',
  ]);

  for (const key of Object.keys(raw)) {
    if (!allowedTopLevel.has(key)) {
      throw new Error(`Unsupported scenario override field: ${key}`);
    }
  }

  const normalized = {
    anchor_balance_override: null,
    warning_balance_threshold: DEFAULT_LOW_BALANCE_WARNING,
    profile_overrides: new Map(),
    category_overrides: new Map(),
    category_default_window: null,
    category_adjustment_day: 28,
  };

  const anchorValue = raw.anchor_balance_override != null
    ? raw.anchor_balance_override
    : raw.anchor_balance;
  if (anchorValue != null && anchorValue !== '') {
    const parsed = Number(anchorValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error('anchor_balance_override must be a number >= 0.');
    }
    normalized.anchor_balance_override = round2(parsed);
  }

  const warningValue = raw.warning_balance_threshold != null
    ? raw.warning_balance_threshold
    : raw.low_balance_warning_threshold;
  if (warningValue != null && warningValue !== '') {
    const parsed = Number(warningValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error('warning_balance_threshold must be a number >= 0.');
    }
    normalized.warning_balance_threshold = round2(parsed);
  }

  const adjustmentDayValue = raw.category_adjustment_day;
  if (adjustmentDayValue != null && adjustmentDayValue !== '') {
    const parsed = Number(adjustmentDayValue);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
      throw new Error('category_adjustment_day must be an integer between 1 and 31.');
    }
    normalized.category_adjustment_day = parsed;
  }

  if (raw.profile_overrides != null) {
    const profileEntries = [];

    if (Array.isArray(raw.profile_overrides)) {
      for (const item of raw.profile_overrides) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          throw new Error('Each profile override must be an object.');
        }
        const profileKey = String(item.profile_key || '').trim();
        if (!profileKey) {
          throw new Error('Each profile override array item must include profile_key.');
        }

        const fields = { ...item };
        delete fields.profile_key;
        profileEntries.push([profileKey, fields]);
      }
    } else if (typeof raw.profile_overrides === 'object') {
      for (const [profileKey, fields] of Object.entries(raw.profile_overrides)) {
        profileEntries.push([String(profileKey).trim(), fields]);
      }
    } else {
      throw new Error('profile_overrides must be an object map or array.');
    }

    for (const [profileKey, fields] of profileEntries) {
      if (!profileKey) continue;
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        throw new Error(`Profile override for ${profileKey} must be an object.`);
      }

      const normalizedFields = {};
      for (const [fieldKey, fieldValue] of Object.entries(fields)) {
        const validator = PROFILE_PATCH_VALIDATORS[fieldKey];
        if (!validator) {
          throw new Error(
            `Unsupported profile override field "${fieldKey}" for ${profileKey}.`
          );
        }
        if (fieldValue == null || fieldValue === '') continue;
        normalizedFields[fieldKey] = validator(fieldValue);
      }

      if (Object.keys(normalizedFields).length > 0) {
        normalized.profile_overrides.set(profileKey, normalizedFields);
      }
    }
  }

  if (raw.category_overrides != null) {
    const categoryEntries = [];
    if (Array.isArray(raw.category_overrides)) {
      for (const item of raw.category_overrides) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          throw new Error('Each category override must be an object.');
        }
        const category = String(item.category || '').trim();
        if (!category) {
          throw new Error('Each category override array item must include category.');
        }
        categoryEntries.push([category, item.monthly_amount]);
      }
    } else if (typeof raw.category_overrides === 'object') {
      for (const [category, amount] of Object.entries(raw.category_overrides)) {
        categoryEntries.push([String(category).trim(), amount]);
      }
    } else {
      throw new Error('category_overrides must be an object map or array.');
    }

    for (const [category, amountValue] of categoryEntries) {
      if (!category) continue;
      if (amountValue == null || amountValue === '') continue;
      const parsed = Number(amountValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Category override for "${category}" must be a number >= 0.`);
      }
      normalized.category_overrides.set(category, round2(parsed));
    }
  }

  if (raw.category_default_window != null) {
    if (
      typeof raw.category_default_window !== 'object' ||
      Array.isArray(raw.category_default_window)
    ) {
      throw new Error('category_default_window must be an object when provided.');
    }

    const windowRaw = raw.category_default_window;
    const allowedWindowFields = new Set(['start_month', 'end_month', 'lookback_months']);
    for (const key of Object.keys(windowRaw)) {
      if (!allowedWindowFields.has(key)) {
        throw new Error(`Unsupported category_default_window field: ${key}`);
      }
    }

    normalized.category_default_window = {
      start_month: windowRaw.start_month ? parseMonthKey(windowRaw.start_month).key : null,
      end_month: windowRaw.end_month ? parseMonthKey(windowRaw.end_month).key : null,
      lookback_months: windowRaw.lookback_months,
    };
  }

  return normalized;
}

function applyProfileScenarioOverrides(profiles, scenarioOverrides) {
  const overrides = scenarioOverrides.profile_overrides;
  const applied = [];
  if (!overrides.size) {
    return { effective_profiles: profiles, applied_profile_overrides: applied };
  }

  const profileByKey = new Map(profiles.map((profile) => [profile.profile_key, profile]));
  for (const profileKey of overrides.keys()) {
    if (!profileByKey.has(profileKey)) {
      throw new Error(`Scenario override references unknown profile: ${profileKey}`);
    }
  }

  const effectiveProfiles = profiles.map((profile) => {
    const profilePatch = overrides.get(profile.profile_key);
    if (!profilePatch) return profile;

    const patched = { ...profile };
    for (const [fieldKey, fieldValue] of Object.entries(profilePatch)) {
      if (fieldKey === 'metadata') {
        patched.metadata_json = fieldValue;
      } else {
        patched[fieldKey] = fieldValue;
      }
    }

    if (patched.pattern_type === 'one_time') {
      if (profilePatch.start_date && !profilePatch.end_date) {
        patched.end_date = profilePatch.start_date;
      }
      if (!patched.end_date) {
        patched.end_date = patched.start_date;
      }
    }

    if (patched.end_date && compareDates(patched.end_date, patched.start_date) < 0) {
      throw new Error(`Profile override makes end_date earlier than start_date (${profile.profile_key}).`);
    }

    applied.push({
      profile_key: profile.profile_key,
      fields: Object.keys(profilePatch),
    });

    return patched;
  });

  return {
    effective_profiles: effectiveProfiles,
    applied_profile_overrides: applied,
  };
}

async function buildCategoryOverrideEvents(knex, accountIdentifier, forecastWindow, scenarioOverrides) {
  const applied = [];
  if (!scenarioOverrides.category_overrides.size) {
    return {
      events: [],
      applied_category_overrides: applied,
      category_defaults: null,
    };
  }

  const windowRequest = scenarioOverrides.category_default_window || {};
  const defaultsPayload = await loadCategoryDefaults(
    knex,
    accountIdentifier,
    forecastWindow,
    windowRequest
  );
  const defaultsByCategory = new Map(
    defaultsPayload.categories.map((entry) => [entry.category, entry])
  );

  const adjustmentDay = scenarioOverrides.category_adjustment_day;
  const events = [];

  for (const [category, overrideAmount] of scenarioOverrides.category_overrides.entries()) {
    const defaultEntry = defaultsByCategory.get(category);
    if (!defaultEntry) {
      throw new Error(
        `Category override "${category}" is unavailable in the current default window (${defaultsPayload.category_window.start_month} to ${defaultsPayload.category_window.end_month}).`
      );
    }

    const delta = round2(overrideAmount - defaultEntry.default_monthly_amount);
    applied.push({
      category,
      default_monthly_amount: defaultEntry.default_monthly_amount,
      override_monthly_amount: overrideAmount,
      monthly_delta: delta,
    });

    if (Math.abs(delta) < 0.01) continue;

    const profileKey = `category_override_${slugify(category, 42)}`;
    const profileName = `Category override: ${category}`;
    const sourceNote = `scenario override ${category}: ${defaultEntry.default_monthly_amount.toFixed(
      2
    )} -> ${overrideAmount.toFixed(2)}`;
    const direction = delta >= 0 ? 'expense' : 'income';
    const amount = delta >= 0 ? -Math.abs(delta) : Math.abs(delta);

    for (const monthKey of forecastWindow.month_keys) {
      const date = clampDayInMonth(monthKey, adjustmentDay);
      events.push({
        date,
        profile_id: null,
        profile_key: profileKey,
        profile_name: profileName,
        pattern_type: 'category_monthly_override',
        direction,
        amount: round2(amount),
        amount_abs: round2(Math.abs(amount)),
        category,
        source_type: 'scenario_override',
        source_note: sourceNote,
        confidence_label: 'high',
        confidence_score: 1,
        assumption_note: `Category default window ${defaultsPayload.category_window.start_month} to ${defaultsPayload.category_window.end_month}.`,
        row_type: 'category_override_adjustment',
        is_non_cash: false,
        status: 'scheduled',
        account_identifier: accountIdentifier,
      });
    }
  }

  return {
    events,
    applied_category_overrides: applied,
    category_defaults: defaultsPayload,
  };
}

function summarizeScenarioAnswer(rows, warningBalanceThreshold) {
  const cashRows = rows.filter((row) => !row.is_non_cash);
  if (!cashRows.length) {
    return {
      warning_balance_threshold: warningBalanceThreshold,
      survives_forecast_window: true,
      lowest_balance: null,
      first_negative_balance: null,
      low_balance_row_count: 0,
    };
  }

  let lowestRow = cashRows[0];
  for (const row of cashRows) {
    if (Number(row.running_balance) < Number(lowestRow.running_balance)) {
      lowestRow = row;
    }
  }

  const firstNegative = cashRows.find((row) => Number(row.running_balance) < 0) || null;
  const lowBalanceRows = cashRows.filter(
    (row) => Number(row.running_balance) < Number(warningBalanceThreshold)
  );

  return {
    warning_balance_threshold: warningBalanceThreshold,
    survives_forecast_window: !firstNegative,
    lowest_balance: {
      date: lowestRow.date,
      running_balance: round2(lowestRow.running_balance),
      profile_key: lowestRow.profile_key,
      profile_name: lowestRow.profile_name,
    },
    first_negative_balance: firstNegative
      ? {
        date: firstNegative.date,
        running_balance: round2(firstNegative.running_balance),
      }
      : null,
    low_balance_row_count: lowBalanceRows.length,
  };
}

async function generateForecast(knex, searchParams, options = {}) {
  const accountIdentifier = resolveAccountIdentifierFromSearch(searchParams);
  await ensureProjectionSeedData(knex, accountIdentifier);

  const forecastWindow = resolveForecastWindow(searchParams);
  const includeInactive = asBool(searchParams.get('include_inactive'), false);

  let profileQuery = knex('projection_profiles')
    .where({ account_identifier: accountIdentifier })
    .orderBy('profile_name', 'asc');

  if (!includeInactive) {
    profileQuery = profileQuery.andWhere('active', 1);
  }

  const profiles = await profileQuery;
  const anchor = await resolveAnchor(knex, accountIdentifier, forecastWindow);

  const rawScenarioOverrides = options.scenario_overrides != null
    ? options.scenario_overrides
    : parseScenarioOverridesFromSearch(searchParams);
  const scenarioOverrides = normalizeScenarioOverrides(rawScenarioOverrides);

  const {
    effective_profiles: effectiveProfiles,
    applied_profile_overrides: appliedProfileOverrides,
  } = applyProfileScenarioOverrides(profiles, scenarioOverrides);

  const nonLinkedProfiles = effectiveProfiles.filter(
    (profile) => profile.pattern_type !== 'paycheck_linked_percent_plus_monthly'
  );
  const linkedProfiles = effectiveProfiles.filter(
    (profile) => profile.pattern_type === 'paycheck_linked_percent_plus_monthly'
  );

  const events = [];
  const eventsByProfile = new Map();

  for (const profile of nonLinkedProfiles) {
    const generated = generateNonLinkedProfileEvents(profile, forecastWindow);
    eventsByProfile.set(profile.profile_key, generated);
    events.push(...generated);
  }

  for (const profile of linkedProfiles) {
    const generated = generatePaycheckLinkedEvents(profile, forecastWindow, eventsByProfile);
    eventsByProfile.set(profile.profile_key, generated);
    events.push(...generated);
  }

  const {
    events: categoryOverrideEvents,
    applied_category_overrides: appliedCategoryOverrides,
    category_defaults: categoryDefaults,
  } = await buildCategoryOverrideEvents(
    knex,
    accountIdentifier,
    forecastWindow,
    scenarioOverrides
  );
  events.push(...categoryOverrideEvents);

  events.sort((left, right) => {
    const byDate = compareDates(left.date, right.date);
    if (byDate !== 0) return byDate;

    if (left.is_non_cash !== right.is_non_cash) {
      return left.is_non_cash ? 1 : -1;
    }

    if (left.amount !== right.amount) {
      return left.amount - right.amount;
    }

    return left.profile_name.localeCompare(right.profile_name);
  });

  const defaultAnchorBalance = round2(Number(anchor ? anchor.anchor_balance : 0));
  const effectiveAnchorBalance = scenarioOverrides.anchor_balance_override == null
    ? defaultAnchorBalance
    : scenarioOverrides.anchor_balance_override;

  let runningBalance = Number(effectiveAnchorBalance);

  const rows = events.map((event) => {
    if (!event.is_non_cash) {
      runningBalance += Number(event.amount) || 0;
    }

    return {
      ...event,
      running_balance: round2(runningBalance),
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      if (row.is_non_cash) {
        acc.non_cash_rows += 1;
        return acc;
      }

      if (row.amount >= 0) {
        acc.income_total += row.amount;
      } else {
        acc.expense_total += row.amount;
      }
      acc.net_total += row.amount;
      return acc;
    },
    {
      income_total: 0,
      expense_total: 0,
      net_total: 0,
      non_cash_rows: 0,
    }
  );

  const endingBalance = rows.length
    ? rows[rows.length - 1].running_balance
    : round2(runningBalance);

  return {
    account_identifier: accountIdentifier,
    sign_convention: SIGN_CONVENTION,
    forecast_window: forecastWindow,
    anchor: anchor ? projectionAnchorRowToApi(anchor) : null,
    effective_anchor_balance: effectiveAnchorBalance,
    totals: {
      income_total: round2(totals.income_total),
      expense_total: round2(totals.expense_total),
      net_total: round2(totals.net_total),
      row_count: rows.length,
      non_cash_rows: totals.non_cash_rows,
      ending_balance: endingBalance,
    },
    month_totals: summarizeForecastRows(rows),
    rows,
    scenario_answer: summarizeScenarioAnswer(rows, scenarioOverrides.warning_balance_threshold),
    applied_overrides: {
      default_anchor_balance: defaultAnchorBalance,
      anchor_balance_override: scenarioOverrides.anchor_balance_override,
      warning_balance_threshold: scenarioOverrides.warning_balance_threshold,
      profile_overrides: appliedProfileOverrides,
      category_overrides: appliedCategoryOverrides,
      category_default_window: categoryDefaults ? categoryDefaults.category_window : null,
    },
    assumptions: effectiveProfiles.map((profile) => ({
      profile_key: profile.profile_key,
      profile_name: profile.profile_name,
      source_type: profile.source_type,
      source_note: profile.source_note,
      confidence_label: profile.confidence_label,
      confidence_score: Number(profile.confidence_score),
      assumption_note: profile.assumption_note,
      override_applied: scenarioOverrides.profile_overrides.has(profile.profile_key),
    })),
  };
}

const PROFILE_PATCH_VALIDATORS = {
  amount_value: (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error('amount_value must be a number >= 0.');
    }
    return round2(parsed);
  },
  day_of_month: (value) => {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
      throw new Error('day_of_month must be an integer between 1 and 31.');
    }
    return parsed;
  },
  cadence_interval_months: (value) => {
    if (value == null || value === '') return 1;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 24) {
      throw new Error('cadence_interval_months must be an integer between 1 and 24.');
    }
    return parsed;
  },
  cadence_interval_days: (value) => {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 45) {
      throw new Error('cadence_interval_days must be an integer between 1 and 45.');
    }
    return parsed;
  },
  start_date: (value) => safeDateToken(value),
  end_date: (value) => {
    if (value == null || value === '') return null;
    return safeDateToken(value);
  },
  paused: (value) => asBool(value, false),
  resume_date: (value) => {
    if (value == null || value === '') return null;
    return safeDateToken(value);
  },
  assumption_note: (value) => {
    if (value == null) return null;
    return String(value).trim();
  },
  active: (value) => asBool(value, true),
  metadata: (value) => {
    if (value == null) return null;
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('metadata must be an object when provided.');
    }
    return toJsonText(value);
  },
};

async function updateProjectionProfile(knex, profileKey, payload) {
  if (!profileKey || !String(profileKey).trim()) {
    throw new Error('profileKey is required.');
  }

  const profile = await knex('projection_profiles')
    .where({ profile_key: String(profileKey).trim() })
    .first();

  if (!profile) {
    throw new Error(`Projection profile not found: ${profileKey}`);
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('JSON object body is required.');
  }

  const updates = {
    updated_at: nowEpoch(),
  };

  const keys = Object.keys(payload);
  if (!keys.length) {
    throw new Error('At least one updatable field must be provided.');
  }

  for (const key of keys) {
    const validator = PROFILE_PATCH_VALIDATORS[key];
    if (!validator) {
      throw new Error(
        `Unsupported profile update field: ${key}. Allowed fields: ${Object.keys(
          PROFILE_PATCH_VALIDATORS
        ).join(', ')}`
      );
    }

    if (key === 'metadata') {
      updates.metadata_json = validator(payload[key]);
    } else {
      updates[key] = validator(payload[key]);
    }
  }

  await knex('projection_profiles').where({ id: profile.id }).update(updates);

  const updated = await knex('projection_profiles').where({ id: profile.id }).first();
  return {
    account_identifier: updated.account_identifier,
    profile: projectionProfileRowToApi(updated),
  };
}

module.exports = {
  DEFAULT_ACCOUNT_IDENTIFIER,
  SIGN_CONVENTION,
  ensureProjectionSeedData,
  listProjectionProfiles,
  listProjectionAnchors,
  listProjectionCategoryDefaults,
  listInferredCandidates,
  refreshInferredCandidates,
  generateForecast,
  updateProjectionProfile,
};
