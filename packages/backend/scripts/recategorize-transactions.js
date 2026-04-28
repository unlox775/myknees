#!/usr/bin/env node
/**
 * Recompute categories for a date range while preserving manual overrides.
 *
 * Rules:
 * - category_source=manual_override rows are never rewritten.
 * - All other rows in scope are recalculated from current rule-based mappings and
 *   set to category_source=rule_based.
 *
 * Usage:
 *   node scripts/recategorize-transactions.js --from=2026-01-01 --to=2026-04-23
 *   node scripts/recategorize-transactions.js --from=2026-01-01 --to=2026-04-23 --account=Ally_Bank
 *   node scripts/recategorize-transactions.js --from=2026-01-01 --to=2026-04-23 --account=Ally_Bank,Capital_One --dry-run
 */

const { getKnex } = require('../src/db/knex');
const { nowEpoch } = require('../src/db/dates');
const { getParser } = require('../src/classification');
const { resolveFormatIdentifier } = require('../src/reconciliation/resolve-format');
const {
  resolveTransactionCategory,
  loadCategoryMaps,
  loadOverrides,
  loadRuleOverrides,
} = require('../src/classification/resolve-transaction-category');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getArg(name) {
  const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=').slice(1).join('=').trim();
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1].trim();
  }
  return null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function validateDate(label, value) {
  if (!value || !DATE_RE.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  const t = Date.parse(value + 'T12:00:00.000Z');
  if (Number.isNaN(t)) throw new Error(`${label} is not a valid calendar date`);
  return value;
}

async function main() {
  const from = validateDate('--from', getArg('from'));
  const to = validateDate('--to', getArg('to'));
  if (from > to) {
    throw new Error('--from must be <= --to');
  }

  const accountArg = getArg('account');
  const accountFilters = accountArg
    ? accountArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const dryRun = hasFlag('dry-run');

  const knex = getKnex();
  const catMap = await loadCategoryMaps(knex);
  const ovrMap = await loadOverrides(knex);
  const ruleOverrideMap = await loadRuleOverrides(knex);
  const ts = nowEpoch();

  let q = knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .leftJoin('parse_formats', 'parse_formats.id', 'accounts.parse_format_id')
    .whereBetween('transactions.date', [from, to])
    .select(
      'transactions.id',
      'transactions.account_id',
      'transactions.date',
      'transactions.description',
      'transactions.category',
      'transactions.one_time_event_id',
      'transactions.category_source',
      'accounts.identifier as account_identifier',
      'parse_formats.identifier as parse_format_identifier'
    )
    .orderBy('transactions.date', 'asc')
    .orderBy('transactions.id', 'asc');

  if (accountFilters.length > 0) {
    q = q.whereIn('accounts.identifier', accountFilters);
  }

  const rows = await q;

  const formatCache = new Map();
  async function formatForAccount(accountId) {
    if (formatCache.has(accountId)) return formatCache.get(accountId);
    const formatId = await resolveFormatIdentifier(knex, accountId);
    formatCache.set(accountId, formatId);
    return formatId;
  }

  let scanned = 0;
  let skippedManual = 0;
  let updatedRows = 0;
  let changedCategory = 0;
  let unchangedCategory = 0;

  for (const tx of rows) {
    scanned += 1;
    if (tx.category_source === 'manual_override') {
      skippedManual += 1;
      continue;
    }

    const formatId = tx.parse_format_identifier || (await formatForAccount(tx.account_id));
    const parser = getParser(formatId);
    const desc = tx.description || '';
    const norm = parser ? parser.normalize(desc) : desc.trim().toLowerCase();
    const resolved = resolveTransactionCategory(formatId, desc, norm, ovrMap, catMap, ruleOverrideMap);
    const nextCategory = resolved.category;
    const nextOneTimeEventId = resolved.one_time_event_id || null;

    const needsUpdate =
      tx.category !== nextCategory ||
      (tx.one_time_event_id || null) !== nextOneTimeEventId ||
      tx.category_source !== 'rule_based';
    if (!needsUpdate) {
      unchangedCategory += 1;
      continue;
    }

    if (tx.category !== nextCategory) {
      changedCategory += 1;
    } else {
      unchangedCategory += 1;
    }

    if (!dryRun) {
      await knex('transactions')
        .where({ id: tx.id })
        .update({
          category: nextCategory,
          one_time_event_id: nextOneTimeEventId,
          category_source: 'rule_based',
          updated_at: ts,
        });
    }
    updatedRows += 1;
  }

  console.log('Recategorize transactions summary');
  console.log('scope:', `${from}..${to}`);
  console.log('accounts:', accountFilters.length ? accountFilters.join(', ') : '(all)');
  console.log('dry_run:', dryRun ? 'yes' : 'no');
  console.log('rows_scanned:', scanned);
  console.log('rows_skipped_manual_override:', skippedManual);
  console.log('rows_updated:', updatedRows);
  console.log('rows_with_category_change:', changedCategory);
  console.log('rows_already_matching_rule:', unchangedCategory);

  await knex.destroy();
}

main().catch((err) => {
  console.error(
    err && err.message ? err.message : err
  );
  console.error(
    'Usage: node scripts/recategorize-transactions.js --from=YYYY-MM-DD --to=YYYY-MM-DD [--account=Ally_Bank,Capital_One] [--dry-run]'
  );
  process.exit(1);
});
