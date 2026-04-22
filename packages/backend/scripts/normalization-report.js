#!/usr/bin/env node
/**
 * Normalization health report: per format, per account, merge buckets, summary.
 *
 *   node scripts/normalization-report.js
 *   node scripts/normalization-report.js --since=2024-01-01
 *   node scripts/normalization-report.js --since=2023-01-01 --until=2025-12-31
 *   node scripts/normalization-report.js --from=2024-06-01 --to=2025-06-30
 *   node scripts/normalization-report.js --out=/custom/data/parent
 *
 * Date scope (optional, mutually exclusive modes):
 *   --since=DATE or --after=DATE  : transactions with date >= DATE
 *   --until=DATE                  : optional upper bound (use with --since)
 *   --from=DATE --to=DATE         : inclusive range (both required)
 *
 * With a date filter: only transaction rows in range count; only distinct descriptions
 * that appear in that range define the raw set; accounts with zero tx in range are omitted.
 */

const fs = require('fs');
const path = require('path');
const { getKnex } = require('../src/db/knex');

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

/**
 * @param {Array<{raw_value: string, normalized_value: string}>} rows
 */
function analyzeRows(rows) {
  const rawCnt = rows.length;
  const normSet = new Set(rows.map((r) => r.normalized_value));
  const normCnt = normSet.size;

  let rawNeqNorm = 0;
  let rawLcEqNorm = 0;
  for (const r of rows) {
    if (r.raw_value !== r.normalized_value) rawNeqNorm++;
    if (String(r.raw_value).trim().toLowerCase() === r.normalized_value) rawLcEqNorm++;
  }

  const normToRaws = new Map();
  for (const r of rows) {
    const k = r.normalized_value;
    if (!normToRaws.has(k)) normToRaws.set(k, []);
    normToRaws.get(k).push(r.raw_value);
  }

  const bucketsBySize = [];
  for (const [norm, list] of normToRaws) {
    if (list.length > 1) {
      bucketsBySize.push({ norm, size: list.length, samples: list });
    }
  }
  bucketsBySize.sort((a, b) => b.size - a.size);

  let rawsInMergeBuckets = 0;
  for (const b of bucketsBySize) {
    rawsInMergeBuckets += b.size;
  }

  const mergeBuckets = bucketsBySize.length;
  const singletonRaws = rawCnt - rawsInMergeBuckets;
  const compression = normCnt ? (rawCnt / normCnt).toFixed(2) : '—';

  const mergeRawSet = new Set();
  for (const b of bucketsBySize) {
    for (const s of b.samples) mergeRawSet.add(s);
  }

  return {
    rawCnt,
    normCnt,
    compression,
    mergeBuckets,
    rawsInMergeBuckets,
    singletonRaws,
    rawNeqNorm,
    rawLcEqNorm,
    pctRawInMerge: rawCnt ? fmtPct(rawsInMergeBuckets, rawCnt) : '0.0',
    pctSingleton: rawCnt ? fmtPct(singletonRaws, rawCnt) : '0.0',
    pctScrubbedDistinct: rawCnt ? fmtPct(rawNeqNorm, rawCnt) : '0.0',
    pctLcOnlyDistinct: rawCnt ? fmtPct(rawLcEqNorm, rawCnt) : '0.0',
    bucketsBySize,
    mergeRawSet,
    rawValues: new Set(rows.map((r) => r.raw_value)),
  };
}

const LEGEND_LINES = [
  'Metric key (read scrub vs merge vs txMerge — they measure different things):',
  '  raw/norm      Count of distinct raw description strings in scope / distinct normalized',
  '                strings after the format’s parser. Second number ≤ first when raws collapse.',
  '  scrub%        Of those distinct raws, what % have raw text ≠ normalized (parser removed',
  '                or changed characters — #refs, decimals, Amazon tails, LC, etc.).',
  '  merge%        Of those distinct raws, what % participate in a “merge bucket”: same',
  '                normalized string as at least one *other* raw in this scope. High merge%',
  '                ⇒ many merchant variants folding to one label (good for category grouping).',
  '  txMerge%       Of individual *transaction rows* in scope, what % use a description that is',
  '                a merge-bucket raw (same payee text as another raw under that norm).',
  '                Can differ from merge% because popular merchants have more tx rows.',
  '',
];

function formatDetailLines(title, pf, stats, txTotal, txnInMerge, dateNote) {
  const lines = [];
  const out = (s) => lines.push(s);
  const fid = pf.identifier;
  out('MyKnees normalization report (detail)');
  out(`Scope: ${title}`);
  if (dateNote) out(`Date filter: ${dateNote}`);
  out(`Generated: ${new Date().toISOString()}`);
  out('');
  LEGEND_LINES.forEach((l) => out(l));
  out('══════════════════════════════════════════════════════════════');
  out(`Format: ${fid}${pf.display_name ? ` (${pf.display_name})` : ''}`);
  out('──────────────────────────────────────────────────────────────');
  out(`  Distinct raw / normalized:     ${stats.rawCnt} / ${stats.normCnt}`);
  out(`  Compression (raw / norm):      ${stats.compression}`);
  out(`  Scrubbed (raw ≠ norm):         ${stats.rawNeqNorm} (${stats.pctScrubbedDistinct}% of distinct raws)`);
  out(`  lower(trim(raw)) = norm only:  ${stats.rawLcEqNorm} (${stats.pctLcOnlyDistinct}% of distinct raws)`);
  out(`  Merge buckets (norm → 2+ raws): ${stats.mergeBuckets}`);
  out(`  Distinct raws in any merge:    ${stats.rawsInMergeBuckets} (${stats.pctRawInMerge}% of distinct raws)`);
  out(`  Distinct raws singleton-only:  ${stats.singletonRaws} (${stats.pctSingleton}%)`);
  out('');
  if (txTotal > 0) {
    out(`  Transactions in scope:        ${txTotal}`);
    out(`  Tx on merged raw descriptions: ${txnInMerge} (${fmtPct(txnInMerge, txTotal)}% of tx rows) ← txMerge%`);
  } else {
    out('  Transactions in scope:         0');
  }
  out('');

  const topN = Math.min(15, stats.bucketsBySize.length);
  if (topN === 0) {
    out('  Largest merge buckets: (none)');
  } else {
    out(`  Top ${topN} merge buckets (by raw variant count):`);
    for (let i = 0; i < topN; i++) {
      const b = stats.bucketsBySize[i];
      const nv = b.norm;
      const head = nv.length > 120 ? `${nv.slice(0, 120)}…` : nv;
      out(`    ×${b.size}  norm: "${head}"`);
      for (const s of b.samples.slice(0, 5)) {
        const sh = s.length > 160 ? `${s.slice(0, 160)}…` : s;
        out(`         - ${sh}`);
      }
      if (b.samples.length > 5) out(`         … +${b.samples.length - 5} more raw variants`);
    }
  }
  out('');
  out('── Next steps ──');
  out('  After changing parsers: npm run recompute-normalized, then rerun this report.');
  return lines.join('\n');
}

/**
 * Build description → count for transactions matching date scope.
 * @returns {Map<string, number>}
 */
async function loadTxDescCounts(knex, dateScope) {
  let q = knex('transactions').select('description');
  if (dateScope) {
    q = q.where('date', '>=', dateScope.min);
    if (dateScope.max) q = q.andWhere('date', '<=', dateScope.max);
  }
  const rows = await q;
  const m = new Map();
  for (const { description } of rows) {
    m.set(description, (m.get(description) || 0) + 1);
  }
  return m;
}

async function main() {
  const parentOverride = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1]?.trim();

  let dateScope;
  try {
    dateScope = parseDateScope();
  } catch (e) {
    console.error(e.message);
    console.error(
      'Usage: [--since=YYYY-MM-DD [--until=YYYY-MM-DD] | --after=…]  OR  --from=YYYY-MM-DD --to=YYYY-MM-DD]'
    );
    process.exit(1);
  }

  const knex = getKnex();
  const dataDir = parentOverride ? path.resolve(parentOverride) : getDataDir();
  const reportRoot = path.join(dataDir, 'normalization-reports', stampFolderName());
  const dirFormat = path.join(reportRoot, 'by-format');
  const dirAccount = path.join(reportRoot, 'by-account');
  fs.mkdirSync(dirFormat, { recursive: true });
  fs.mkdirSync(dirAccount, { recursive: true });

  const txDescCounts = await loadTxDescCounts(knex, dateScope);
  const filteredDescSet = new Set(txDescCounts.keys());
  const dateNote = dateScope ? dateScope.label : 'all dates';

  const formats = await knex('parse_formats')
    .select('id', 'identifier', 'display_name')
    .orderBy('identifier');

  const summaryLines = [];
  const sum = (s) => summaryLines.push(s);

  sum('MyKnees normalization report — SUMMARY');
  sum(`Generated: ${new Date().toISOString()}`);
  sum(`Output folder: ${reportRoot}`);
  sum(`Scope: ${dateNote}`);
  sum('');
  LEGEND_LINES.forEach((l) => sum(l));
  sum('── By parse format ──');

  for (const pf of formats) {
    const pid = pf.id;
    const fid = pf.identifier;

    let rawsQuery = knex('classification_raw_values as rv')
      .join('classification_normalized as n', 'n.raw_value_id', 'rv.id')
      .where('rv.parse_format_id', pid)
      .select('rv.raw_value', 'n.normalized_value');

    if (dateScope && filteredDescSet.size > 0) {
      rawsQuery = rawsQuery.whereIn('rv.raw_value', [...filteredDescSet]);
    }

    const raws = await rawsQuery;
    const stats = analyzeRows(raws);

    let txnTotal = 0;
    let txnInMerge = 0;
    for (const [desc, cnt] of txDescCounts) {
      if (!stats.rawValues.has(desc)) continue;
      txnTotal += cnt;
      if (stats.mergeRawSet.has(desc)) txnInMerge += cnt;
    }

    sum(
      `${fid.padEnd(18)}  raw/norm:${String(stats.rawCnt).padStart(6)}/${String(stats.normCnt).padEnd(6)}  ` +
        `scrub:${String(stats.pctScrubbedDistinct).padStart(5)}%  merge:${String(stats.pctRawInMerge).padStart(5)}%  ` +
        `txMerge:${txnTotal ? String(fmtPct(txnInMerge, txnTotal)).padStart(5) : '  0.0'}%  (tx=${txnTotal})`
    );

    const body = formatDetailLines(
      dateScope ? `parse format (descriptions appearing in ${dateNote})` : 'all data for parse format',
      pf,
      stats,
      txnTotal,
      txnInMerge,
      dateNote
    );
    fs.writeFileSync(path.join(dirFormat, `${fid}.txt`), body, 'utf8');
  }

  sum('');
  sum('── By account (dominant parse format from tx descriptions in scope) ──');

  const accounts = await knex('accounts').select('id', 'identifier', 'name').orderBy('identifier');

  const fmtRows = await knex('parse_formats').select('id', 'identifier');
  const formatIdToIdent = new Map(fmtRows.map((f) => [f.id, f.identifier]));

  for (const acc of accounts) {
    const aid = acc.id;
    const ident = acc.identifier;

    let txq = knex('transactions').where('account_id', aid).select('description');
    if (dateScope) {
      txq = txq.where('date', '>=', dateScope.min);
      if (dateScope.max) txq = txq.andWhere('date', '<=', dateScope.max);
    }
    const txRows = await txq;

    const descCounts = new Map();
    for (const { description } of txRows) {
      descCounts.set(description, (descCounts.get(description) || 0) + 1);
    }

    if (descCounts.size === 0) {
      if (!dateScope) {
        sum(`${ident.padEnd(22)}  (no transactions)`);
        fs.writeFileSync(
          path.join(dirAccount, `${ident}.txt`),
          `No transactions for account ${ident}.\n`,
          'utf8'
        );
      }
      continue;
    }

    const descriptions = [...descCounts.keys()];
    const qmarks = descriptions.map(() => '?').join(',');
    const domSql = `
      SELECT parse_format_id, COUNT(DISTINCT raw_value) AS n
      FROM classification_raw_values
      WHERE raw_value IN (${qmarks})
      GROUP BY parse_format_id
      ORDER BY n DESC
    `;
    const domRes = await knex.raw(domSql, descriptions);
    const domRows =
      domRes && (domRes.rows !== undefined ? domRes.rows : Array.isArray(domRes[0]) ? domRes[0] : domRes);
    const best = domRows && domRows[0];
    if (!best || best.parse_format_id == null) {
      sum(`${ident.padEnd(22)}  (no classification_raw_values match)`);
      fs.writeFileSync(
        path.join(dirAccount, `${ident}.txt`),
        `No classification_raw_values matched transaction descriptions for ${ident}.\n`,
        'utf8'
      );
      continue;
    }

    const domPid = Number(best.parse_format_id);
    const domFid = formatIdToIdent.get(domPid) || formatIdToIdent.get(best.parse_format_id) || '?';

    const subRaws = await knex('classification_raw_values as rv')
      .join('classification_normalized as n', 'n.raw_value_id', 'rv.id')
      .where('rv.parse_format_id', domPid)
      .whereIn('rv.raw_value', descriptions)
      .select('rv.raw_value', 'n.normalized_value');

    const aStats = analyzeRows(subRaws);

    let atxTotal = 0;
    let atxMerge = 0;
    for (const [desc, cnt] of descCounts) {
      if (!aStats.rawValues.has(desc)) continue;
      atxTotal += cnt;
      if (aStats.mergeRawSet.has(desc)) atxMerge += cnt;
    }

    sum(
      `${ident.padEnd(22)}  format:${domFid.padEnd(14)}  raw/norm:${String(aStats.rawCnt).padStart(5)}/` +
        `${String(aStats.normCnt).padEnd(5)}  scrub:${String(aStats.pctScrubbedDistinct).padStart(5)}%  ` +
        `merge:${String(aStats.pctRawInMerge).padStart(5)}%  txMerge:${atxTotal ? String(fmtPct(atxMerge, atxTotal)).padStart(5) : '  0.0'}%  (tx=${atxTotal})`
    );

    const pfRow = formats.find((f) => f.id === domPid) || { identifier: domFid, display_name: '' };
    const accBody =
      formatDetailLines(
        `account ${ident} (${dateNote})`,
        pfRow,
        aStats,
        atxTotal,
        atxMerge,
        dateNote
      ) +
      '\n\n' +
      `# Account: ${acc.name || ident}\n` +
      `# Dominant parse format for this account’s descriptions: ${domFid}\n`;

    fs.writeFileSync(path.join(dirAccount, `${ident}.txt`), accBody, 'utf8');
  }

  sum('');
  sum(`Full detail: ${dirFormat}/<format>.txt  and  ${dirAccount}/<Identifier>.txt`);

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
