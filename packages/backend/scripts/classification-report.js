#!/usr/bin/env node
/**
 * Classification coverage report (mirrors normalization-report layout):
 * data/classification-reports/<stamp>/summary.txt, by-format/*.txt, by-account/*.txt, full-report.txt
 *
 * For transactions in the date scope, shows what % resolve from DB (override + mapping,
 * including Capital One tail match and chase→capital_one fallback), what % from heuristics
 * only, and what % are unmapped (no mapping row; falls through to Undefined).
 *
 *   node scripts/classification-report.js
 *   node scripts/classification-report.js --since=2026-01-01 --until=2026-01-31
 *   node scripts/classification-report.js --from=2026-01-01 --to=2026-01-31
 *   node scripts/classification-report.js --out=/custom/data/parent
 *
 * Date scope matches normalization-report (optional; omit = all dates).
 */

const fs = require('fs');
const path = require('path');
const { getKnex } = require('../src/db/knex');
const { getParser } = require('../src/classification');
const {
  resolveTransactionCategory,
  loadCategoryMaps,
  loadOverrides,
  loadRuleOverrides,
} = require('../src/classification/resolve-transaction-category');
const { resolveFormatIdentifier } = require('../src/reconciliation/resolve-format');

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

function validateDate(d, label) {
  if (!d || !DATE_RE.test(d)) {
    throw new Error(`${label} must be YYYY-MM-DD, got: ${d}`);
  }
  const t = Date.parse(d + 'T12:00:00Z');
  if (Number.isNaN(t)) throw new Error(`Invalid date: ${label}`);
  return d;
}

/**
 * @returns {null | { min: string, max: string | null, label: string }}
 */
function parseDateScope() {
  const from = getArg('from');
  const to = getArg('to');
  const since = getArg('since') || getArg('after');
  const until = getArg('until');

  if (from || to) {
    if (since || until) {
      throw new Error('Use either (--from and --to) or (--since/--after with optional --until), not both.');
    }
    if (!from || !to) {
      throw new Error('--from and --to must be given together (inclusive range).');
    }
    validateDate(from, '--from');
    validateDate(to, '--to');
    if (from > to) throw new Error('--from must be <= --to');
    return { min: from, max: to, label: `transactions ${from} … ${to} (inclusive)` };
  }

  if (since) {
    validateDate(since, '--since');
    if (until) {
      validateDate(until, '--until');
      if (since > until) throw new Error('--since must be <= --until');
      return { min: since, max: until, label: `transactions ${since} … ${until} (inclusive)` };
    }
    return { min: since, max: null, label: `transactions on or after ${since}` };
  }

  if (until) {
    throw new Error('--until requires --since (or use --from/--to).');
  }

  return null;
}

function getDataDir() {
  try {
    const cfg = require('../src/config');
    return path.join(cfg.getMykneesRoot(), 'data');
  } catch {
    return path.join(process.cwd(), 'data');
  }
}

function fmtPct(n, d) {
  if (!d) return '0.0';
  return ((100 * n) / d).toFixed(1);
}

function stampFolderName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

const LEGEND_LINES = [
  'Metric key:',
  '  tx            Individual transaction rows in the date scope (all accounts).',
  '  db%           % of tx resolved from database: classification_overrides OR',
  '                classification_mappings (including Capital One “category / merchant” tail',
  '                match and chase_visa → capital_one mapping fallback).',
  '  infer%        % of tx where only the small built-in heuristics matched (Income/Transfer',
  '                keywords) — no mapping row.',
  '  unmapped%     % of tx with no DB mapping and no heuristic (shown as Undefined).',
  '  explicitUndef % of tx whose resolved category name is literally "Undefined" from DB',
  '                or fallback (subset of db% + unmapped%).',
  '',
];

/**
 * @param {{ total: number, override: number, mapping: number, capitalOneFb: number, inferred: number, unmapped: number, explicitUndefined: number }} c
 */
function pctLine(c) {
  const t = c.total;
  if (!t) return '  (no transactions in scope)';
  const db = c.override + c.mapping + c.capitalOneFb;
  return (
    `  tx=${t}  db=${db} (${fmtPct(db, t)}%)  ` +
    `override=${c.override}  mapping=${c.mapping}  co_fb=${c.capitalOneFb}  ` +
    `inferred_only=${c.inferred} (${fmtPct(c.inferred, t)}%)  ` +
    `unmapped=${c.unmapped} (${fmtPct(c.unmapped, t)}%)  ` +
    `explicit_undefined_label=${c.explicitUndefined} (${fmtPct(c.explicitUndefined, t)}%)`
  );
}

/**
 * @param {import('knex').Knex} knex
 * @param {{ min: string, max: string|null }} [dateScope]
 */
async function loadTransactionsInScope(knex, dateScope) {
  let q = knex('transactions').join('accounts', 'accounts.id', 'transactions.account_id').select(
    'transactions.id',
    'transactions.account_id',
    'transactions.date',
    'transactions.description',
    'transactions.category',
    'transactions.category_source',
    'accounts.identifier as account_identifier'
  );
  if (dateScope) {
    q = q.where('transactions.date', '>=', dateScope.min);
    if (dateScope.max) q = q.andWhere('transactions.date', '<=', dateScope.max);
  }
  return q.orderBy('transactions.date', 'asc').orderBy('transactions.id', 'asc');
}

/**
 * @param {Awaited<ReturnType<typeof loadTransactionsInScope>>} rows
 */
function accumulateStats(rows, formatCache, catMap, ovrMap, ruleOverrideMap) {
  /** @type {Map<string, { total: number, override: number, mapping: number, capitalOneFb: number, inferred: number, unmapped: number, explicitUndefined: number }>} */
  const byKey = new Map();
  /** @type {Map<string, Map<string, { count: number, sampleDesc: string }>>} */
  const unmappedByFormat = new Map();
  /** @type {Map<string, Map<string, { count: number, sampleDesc: string }>>} */
  const unmappedByAccount = new Map();

  function bump(key, r) {
    if (!byKey.has(key)) {
      byKey.set(key, {
        total: 0,
        override: 0,
        mapping: 0,
        capitalOneFb: 0,
        inferred: 0,
        unmapped: 0,
        explicitUndefined: 0,
      });
    }
    const c = byKey.get(key);
    c.total += 1;
    if (r.source === 'override') c.override += 1;
    else if (r.source === 'mapping') c.mapping += 1;
    else if (r.source === 'capital_one_fallback') c.capitalOneFb += 1;
    else if (r.source === 'inferred') c.inferred += 1;
    else c.unmapped += 1;
    if (r.category === 'Undefined') c.explicitUndefined += 1;
  }

  /** @type {Map<string, { count: number, sampleDesc: string }>} */
  const unmappedNorms = new Map();

  for (const tx of rows) {
    const formatId = formatCache.get(tx.account_id);
    if (!formatId) continue;

    let r;
    if (tx.category_source === 'manual_override' && tx.category) {
      r = { source: 'override', category: tx.category };
    } else {
      const parser = getParser(formatId);
      const desc = tx.description || '';
      const norm = parser ? parser.normalize(desc) : desc.trim().toLowerCase();
      r = resolveTransactionCategory(formatId, desc, norm, ovrMap, catMap, ruleOverrideMap);

      if (r.source === 'unmapped') {
        const k = norm || '(empty norm)';
        const u = unmappedNorms.get(k) || { count: 0, sampleDesc: desc.slice(0, 120) };
        u.count += 1;
        unmappedNorms.set(k, u);

        if (!unmappedByFormat.has(formatId)) unmappedByFormat.set(formatId, new Map());
        const fm = unmappedByFormat.get(formatId);
        const fu = fm.get(k) || { count: 0, sampleDesc: desc.slice(0, 120) };
        fu.count += 1;
        fm.set(k, fu);

        const aid = tx.account_identifier;
        if (!unmappedByAccount.has(aid)) unmappedByAccount.set(aid, new Map());
        const am = unmappedByAccount.get(aid);
        const au = am.get(k) || { count: 0, sampleDesc: desc.slice(0, 120) };
        au.count += 1;
        am.set(k, au);
      }
    }

    bump(`format:${formatId}`, r);
    bump(`account:${tx.account_identifier}`, r);
  }

  return { byKey, unmappedNorms, unmappedByFormat, unmappedByAccount };
}

function formatDetailBody(title, stats, unmappedNorms, topUnmappedLimit) {
  const lines = [];
  const out = (s) => lines.push(s);
  out('MyKnees classification report (detail)');
  out(`Scope: ${title}`);
  out(`Generated: ${new Date().toISOString()}`);
  out('');
  LEGEND_LINES.forEach((l) => out(l));
  out('══════════════════════════════════════════════════════════════');
  out(pctLine(stats));
  out('');
  const sorted = [...unmappedNorms.entries()].sort((a, b) => b[1].count - a[1].count);
  const lim = Math.min(topUnmappedLimit, sorted.length);
  if (lim === 0) {
    out('Unmapped normalized values: (none)');
  } else {
    out(`Top ${lim} unmapped normalized strings (by transaction count):`);
    for (let i = 0; i < lim; i++) {
      const [norm, u] = sorted[i];
      const head = norm.length > 100 ? `${norm.slice(0, 100)}…` : norm;
      out(`  ×${u.count}  "${head}"`);
      out(`       sample: ${u.sampleDesc.length > 140 ? `${u.sampleDesc.slice(0, 140)}…` : u.sampleDesc}`);
    }
  }
  out('');
  out('── Next steps ──');
  out('  Import sheet: make import-ai-classification-csv CSV=…/Finance Analysis - AI Classification.csv');
  out('  Or: npm run import:mappings -- <format> path/to/normalized_value,category.csv');
  return lines.join('\n');
}

async function main() {
  const parentOverride = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1]?.trim();

  let dateScope;
  try {
    dateScope = parseDateScope();
  } catch (e) {
    console.error(e.message);
    console.error(
      'Usage: [--since=YYYY-MM-DD [--until=YYYY-MM-DD] | --after=…]  OR  --from=YYYY-MM-DD --to=YYYY-MM-DD'
    );
    process.exit(1);
  }

  const knex = getKnex();
  const dataDir = parentOverride ? path.resolve(parentOverride) : getDataDir();
  const reportRoot = path.join(dataDir, 'classification-reports', stampFolderName());
  const dirFormat = path.join(reportRoot, 'by-format');
  const dirAccount = path.join(reportRoot, 'by-account');
  fs.mkdirSync(dirFormat, { recursive: true });
  fs.mkdirSync(dirAccount, { recursive: true });

  const dateNote = dateScope ? dateScope.label : 'all dates';
  const txRows = await loadTransactionsInScope(knex, dateScope);

  const formatCache = new Map();
  const accounts = await knex('accounts').select('id', 'identifier');
  for (const a of accounts) {
    formatCache.set(a.id, await resolveFormatIdentifier(knex, a.id));
  }

  const catMap = await loadCategoryMaps(knex);
  const ovrMap = await loadOverrides(knex);
  const ruleOverrideMap = await loadRuleOverrides(knex);

  const { byKey, unmappedNorms, unmappedByFormat, unmappedByAccount } = accumulateStats(
    txRows,
    formatCache,
    catMap,
    ovrMap,
    ruleOverrideMap
  );

  const formats = await knex('parse_formats').select('id', 'identifier', 'display_name').orderBy('identifier');

  const summaryLines = [];
  const sum = (s) => summaryLines.push(s);

  sum('MyKnees classification report — SUMMARY');
  sum(`Generated: ${new Date().toISOString()}`);
  sum(`Output folder: ${reportRoot}`);
  sum(`Scope: ${dateNote}`);
  sum('');
  LEGEND_LINES.forEach((l) => sum(l));
  sum('── By parse format (transactions on accounts using that format) ──');

  let grand = {
    total: 0,
    override: 0,
    mapping: 0,
    capitalOneFb: 0,
    inferred: 0,
    unmapped: 0,
    explicitUndefined: 0,
  };

  for (const pf of formats) {
    const fid = pf.identifier;
    const st = byKey.get(`format:${fid}`);
    if (!st || st.total === 0) {
      sum(`${fid.padEnd(22)}  (no tx in scope)`);
      fs.writeFileSync(
        path.join(dirFormat, `${fid}.txt`),
        `No transactions in scope for accounts with parse format ${fid}.\n`,
        'utf8'
      );
      continue;
    }
    for (const k of ['total', 'override', 'mapping', 'capitalOneFb', 'inferred', 'unmapped', 'explicitUndefined']) {
      grand[k] += st[k];
    }
    sum(`${fid.padEnd(22)}  ${pctLine(st).trim()}`);

    const fmtUnmapped = unmappedByFormat.get(fid) || new Map();

    const body = formatDetailBody(
      `parse format ${fid} (${dateNote})`,
      st,
      fmtUnmapped,
      25
    );
    fs.writeFileSync(path.join(dirFormat, `${fid}.txt`), body, 'utf8');
  }

  sum('');
  sum('── All scoped transactions (rollup) ──');
  sum(pctLine(grand).trim());

  sum('');
  sum('── By account ──');

  for (const acc of accounts) {
    const ident = acc.identifier;
    const st = byKey.get(`account:${ident}`);
    if (!st || st.total === 0) {
      if (!dateScope) {
        sum(`${ident.padEnd(22)}  (no transactions)`);
        fs.writeFileSync(path.join(dirAccount, `${ident}.txt`), `No transactions for account ${ident}.\n`, 'utf8');
      }
      continue;
    }

    const fid = formatCache.get(acc.id) || '?';
    sum(`${ident.padEnd(22)}  format:${String(fid).padEnd(14)}  ${pctLine(st).trim()}`);

    const accUnmapped = unmappedByAccount.get(ident) || new Map();

    const accBody =
      formatDetailBody(`account ${ident} (${dateNote})`, st, accUnmapped, 30) +
      `\n\n# Parse format: ${fid}\n`;
    fs.writeFileSync(path.join(dirAccount, `${ident}.txt`), accBody, 'utf8');
  }

  sum('');
  sum(`Full detail: ${dirFormat}/<format>.txt  and  ${dirAccount}/<Identifier>.txt`);
  sum(`Global unmapped distinct norms (all accounts): ${unmappedNorms.size}`);

  const summaryText = summaryLines.join('\n');
  fs.writeFileSync(path.join(reportRoot, 'summary.txt'), summaryText + '\n', 'utf8');

  const combined = [
    summaryText,
    '\n\n========== FULL BY-FORMAT (concatenated) ==========\n\n',
    ...formats.map((pf) => {
      const p = path.join(dirFormat, `${pf.identifier}.txt`);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    }),
  ].join('\n');
  fs.writeFileSync(path.join(reportRoot, 'full-report.txt'), combined, 'utf8');

  console.error('Wrote report folder:', reportRoot);
  console.error('  summary.txt   full-report.txt   by-format/*.txt   by-account/*.txt');
  console.error('Scope:', dateNote);
  console.log(summaryText);
  await knex.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
