#!/usr/bin/env node
/**
 * Monthly bucket report: transactions grouped by classification category (domain buckets).
 *
 * Excludes reconciled transfer pairs: rows on account A with linked_transaction_id set,
 * and rows on account B that appear as a link target (so card "payment received" +
 * bank "card pmt" do not double-count once paired).
 *
 *   node scripts/bucket-report.js --year=2026 --month=1
 *   node scripts/bucket-report.js --from=2026-01-01 --to=2026-01-31
 *   ACCOUNTS=Ally_Bank,Capital_One  (optional; comma identifiers)
 *   FORMATS=ally_bank,capital_one   (default; restrict by parse format)
 *   --include-linked              (debug: do not exclude reconciled rows)
 *   --out=path/to/parent          (default: data/bucket-reports/<stamp>/)
 */

const fs = require('fs');
const path = require('path');
const { getKnex } = require('../src/db/knex');
const { getParser } = require('../src/classification');
const {
  resolveTransactionCategory,
  loadCategoryMaps,
  loadOverrides,
} = require('../src/classification/resolve-transaction-category');
const { resolveFormatIdentifier } = require('../src/reconciliation/resolve-format');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
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

function validateDate(d, label) {
  if (!d || !DATE_RE.test(d)) {
    throw new Error(`${label} must be YYYY-MM-DD, got: ${d}`);
  }
  return d;
}

function parseMonthToken(s) {
  if (s == null || s === '') return null;
  const n = parseInt(String(s).trim(), 10);
  if (n >= 1 && n <= 12) return n;
  const lower = String(s).trim().toLowerCase();
  const idx = MONTH_NAMES.indexOf(lower);
  if (idx >= 0) return idx + 1;
  const abbr = MONTH_NAMES.findIndex((m) => m.startsWith(lower) && lower.length >= 3);
  if (abbr >= 0) return abbr + 1;
  throw new Error(`Unrecognized month: ${s}`);
}

function lastDayOfMonth(year, month1to12) {
  const d = new Date(Date.UTC(year, month1to12, 0));
  const day = d.getUTCDate();
  return `${year}-${String(month1to12).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateScope() {
  const from = getArg('from');
  const to = getArg('to');
  const year = getArg('year');
  const month = getArg('month');
  if (from || to) {
    if (!from || !to) throw new Error('--from and --to must be given together.');
    validateDate(from, '--from');
    validateDate(to, '--to');
    if (from > to) throw new Error('--from must be <= --to');
    return { from, to, label: `${from} … ${to}` };
  }
  if (year || month) {
    if (!year || !month) throw new Error('Use both --year=YYYY and --month=1|January (or --from/--to).');
    const y = parseInt(String(year).trim(), 10);
    const m = parseMonthToken(month);
    if (!Number.isFinite(y) || y < 1970 || y > 3000) throw new Error('Invalid --year');
    const fromStr = `${y}-${String(m).padStart(2, '0')}-01`;
    const toStr = lastDayOfMonth(y, m);
    return { from: fromStr, to: toStr, label: `${fromStr} … ${toStr} (${y}-${String(m).padStart(2, '0')})` };
  }
  throw new Error('Provide --year=YYYY --month=M or --from=YYYY-MM-DD --to=YYYY-MM-DD');
}

function getDataDir() {
  try {
    const cfg = require('../src/config');
    return path.join(cfg.getMykneesRoot(), 'data');
  } catch {
    return path.join(process.cwd(), 'data');
  }
}

function stampFolderName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

async function main() {
  const { from, to, label } = parseDateScope();
  const includeLinked = hasFlag('include-linked');
  const outArg = getArg('out');
  const accountsArg = process.env.ACCOUNTS?.trim();
  const formatsArg = process.env.FORMATS?.trim();
  const formatFilter = formatsArg
    ? formatsArg.split(',').map((s) => s.trim()).filter(Boolean)
    : ['ally_bank', 'capital_one', 'chase_visa'];

  const knex = getKnex();

  const linkedTargets = await knex('transactions').whereNotNull('linked_transaction_id').pluck('linked_transaction_id');
  const linkedSet = new Set((linkedTargets || []).filter((id) => id != null));

  let q = knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .leftJoin('parse_formats', 'parse_formats.id', 'accounts.parse_format_id')
    .whereBetween('transactions.date', [from, to])
    .select(
      'transactions.id',
      'transactions.account_id',
      'transactions.date',
      'transactions.description',
      'transactions.amount',
      'transactions.linked_transaction_id',
      'accounts.identifier as account_identifier',
      'parse_formats.identifier as parse_format_identifier'
    );

  if (!includeLinked) {
    q = q.whereNull('transactions.linked_transaction_id');
    if (linkedSet.size > 0) {
      q = q.whereNotIn('transactions.id', [...linkedSet]);
    }
  }

  if (accountsArg) {
    const ids = accountsArg.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length) q = q.whereIn('accounts.identifier', ids);
  }

  const txs = await q.orderBy('transactions.date', 'asc').orderBy('transactions.id', 'asc');

  const formatCache = new Map();
  async function formatForAccount(accountId) {
    if (formatCache.has(accountId)) return formatCache.get(accountId);
    const fid = await resolveFormatIdentifier(knex, accountId);
    formatCache.set(accountId, fid);
    return fid;
  }

  const catMap = await loadCategoryMaps(knex);
  const ovrMap = await loadOverrides(knex);

  /** @type {Map<string, { count: number, sum: number, samples: string[] }>} */
  const buckets = new Map();
  const domainOrder = (
    await knex('classification_categories').select('name').orderBy('id', 'asc')
  ).map((r) => r.name);

  let skippedNoFormat = 0;
  let includedCount = 0;
  const unmappedSamples = [];

  for (const tx of txs) {
    let formatId = tx.parse_format_identifier;
    if (!formatId) {
      formatId = await formatForAccount(tx.account_id);
    }
    if (!formatId || !formatFilter.includes(formatId)) {
      skippedNoFormat++;
      continue;
    }

    const parser = getParser(formatId);
    const desc = tx.description || '';
    const norm = parser ? parser.normalize(desc) : desc.trim().toLowerCase();

    const resolved = resolveTransactionCategory(formatId, desc, norm, ovrMap, catMap);
    const bucket = resolved.category;

    includedCount += 1;

    if (resolved.source === 'unmapped' && unmappedSamples.length < 40) {
      unmappedSamples.push(`${tx.date}\t${tx.account_identifier}\t${norm}\t${desc.slice(0, 80)}`);
    }

    if (!buckets.has(bucket)) {
      buckets.set(bucket, { count: 0, sum: 0, samples: [] });
    }
    const agg = buckets.get(bucket);
    agg.count += 1;
    agg.sum += Number(tx.amount);
    if (agg.samples.length < 5) {
      agg.samples.push(`${tx.date} ${tx.account_identifier} ${Number(tx.amount).toFixed(2)} ${desc.slice(0, 60)}`);
    }
  }

  const parentDir = outArg || path.join(getDataDir(), 'bucket-reports', stampFolderName());
  fs.mkdirSync(parentDir, { recursive: true });
  const reportPath = path.join(parentDir, 'summary.txt');

  const lines = [];
  lines.push(`Bucket report (${label})`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Include reconciled transfer rows: ${includeLinked ? 'yes' : 'no'}`);
  lines.push(`Formats: ${formatFilter.join(', ')}`);
  if (accountsArg) lines.push(`Accounts filter: ${accountsArg}`);
  lines.push(`Transaction rows in window (before format filter): ${txs.length}`);
  lines.push(`Transactions included in buckets: ${includedCount}`);
  lines.push(`Skipped (no matching parse format in filter): ${skippedNoFormat}`);
  if (!includeLinked) {
    lines.push(
      `Note: excluded rows with linked_transaction_id set, and rows whose id is a link target (${linkedSet.size} targets in DB overall).`
    );
  }
  lines.push('');

  let totalCount = 0;
  let totalSum = 0;
  const orderedBuckets = [...domainOrder.filter((n) => buckets.has(n)), ...[...buckets.keys()].filter((k) => !domainOrder.includes(k)).sort()];
  for (const name of orderedBuckets) {
    const agg = buckets.get(name);
    if (!agg) continue;
    totalCount += agg.count;
    totalSum += agg.sum;
    lines.push(`## ${name}`);
    lines.push(`  count: ${agg.count}   sum(amount): ${agg.sum.toFixed(2)}`);
    for (const s of agg.samples) lines.push(`    e.g. ${s}`);
    lines.push('');
  }
  lines.push(`TOTAL count: ${totalCount}   sum(amount): ${totalSum.toFixed(2)}`);
  lines.push('');
  if (unmappedSamples.length) {
    lines.push('## Unmapped sample lines (Undefined bucket)');
    lines.push('date\taccount\tnormalized\tdescription');
    unmappedSamples.forEach((l) => lines.push(l));
  }

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log('Wrote', reportPath);
  await knex.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
