#!/usr/bin/env node
/**
 * Low-hanging fruit report: distinct transaction descriptions that look like they should
 * merge (similar strings) but are still separate raw values — similarity-weighted clusters
 * and top pairs for parser / mapping follow-up.
 *
 *   node scripts/low-hanging-fruit-report.js --account=Chase_CKG
 *   node scripts/low-hanging-fruit-report.js --account=Chase_CKG --account=Chase_VISA
 *   node scripts/low-hanging-fruit-report.js --accounts=Chase_CKG,Chase_VISA,MACU_Dave_Eat_Out
 *   node scripts/low-hanging-fruit-report.js --from=2015-01-01 --to=2023-01-01 --account=Chase_VISA
 *
 * Date scope: same as normalization-report (--since/--until or --from/--to).
 *
 * Output: data/low-hanging-fruit-reports/<timestamp>/{summary.txt, by-account/<Identifier>.txt}
 *
 * By default only pairs where parser normalized_value already DIFFERS are included (real merge gaps).
 * Pass --include-same-norm=true to also list highly similar raws that already share one norm (e.g. case-only dupes).
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

/** @returns {null | { min: string, max: string | null, label: string }} */
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

function stampFolderName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

/** Same visible text as `norm` if we only ignore ASCII case and whitespace runs. */
function differsOnlyByCaseSpace(raw, norm) {
  const r = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  const n = String(norm).trim().toLowerCase().replace(/\s+/g, ' ');
  return r === n;
}

/**
 * Cluster lines: one line per parser label (group raws that already share a norm).
 * @param {string[]} members — raw description strings
 * @param {Map<string, number>} descCounts
 * @param {Map<string, string>} rawToNorm
 * @returns {string[]}
 */
function formatClusterLines(members, descCounts, rawToNorm) {
  /** @type {Map<string, Array<{ raw: string, cnt: number }>>} */
  const byNorm = new Map();
  for (const raw of members) {
    const norm = rawToNorm.get(raw) || '?';
    if (!byNorm.has(norm)) byNorm.set(norm, []);
    byNorm.get(norm).push({ raw, cnt: descCounts.get(raw) || 0 });
  }

  const groups = [...byNorm.entries()].map(([norm, entries]) => {
    const txSum = entries.reduce((s, e) => s + e.cnt, 0);
    return { norm, entries, txSum };
  });
  groups.sort((a, b) => b.txSum - a.txSum);

  const trunc = (s, max) => {
    const t = String(s).trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  };

  const lines = [];
  for (const { norm, entries, txSum } of groups) {
    const normDisp = norm.length > 130 ? `${norm.slice(0, 130)}…` : norm;
    const k = entries.length;
    const sortedEntries = [...entries].sort(
      (a, b) => b.cnt - a.cnt || String(a.raw).localeCompare(String(b.raw))
    );
    const firstExampleRaw = trunc(sortedEntries[0].raw, 72);
    const hasScrubbed = sortedEntries.some((e) => !differsOnlyByCaseSpace(e.raw, norm));

    let line = `  ×${txSum} ${normDisp}`;
    if (k > 1) {
      line += ` (${k}× normalized from e.g. ${firstExampleRaw})`;
    } else if (k === 1 && hasScrubbed) {
      const ex = sortedEntries.find((e) => !differsOnlyByCaseSpace(e.raw, norm)) || sortedEntries[0];
      line += ` (from e.g. ${trunc(ex.raw, 72)})`;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * @param {string} a
 * @param {string} b
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (!la) return lb;
  if (!lb) return la;
  /** @type {number[]} */
  let prev = new Array(lb + 1);
  /** @type {number[]} */
  let cur = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const t = prev;
    prev = cur;
    cur = t;
  }
  return prev[lb];
}

/** Similarity 0..1 from Levenshtein on comparable-length strings */
function ratioSimilarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const d = levenshtein(a, b);
  const mx = Math.max(a.length, b.length);
  return mx ? 1 - d / mx : 1;
}

/** @returns {{ lower: string, noDigits: string, alphaOnly: string }} */
function features(s) {
  const t = String(s).trim();
  const lower = t.toLowerCase();
  const noDigits = lower.replace(/\d/g, '').replace(/\s+/g, ' ').trim();
  const alphaOnly = lower.replace(/[^a-z]/g, '');
  return { lower, noDigits, alphaOnly };
}

/**
 * @param {string} ra
 * @param {string} rb
 * @returns {{ score: number, nd: number, al: number, full: number, reasons: string[] }}
 */
function pairScore(ra, rb) {
  const fa = features(ra);
  const fb = features(rb);
  const reasons = [];

  const nd = ratioSimilarity(fa.noDigits, fb.noDigits);
  const al = ratioSimilarity(fa.alphaOnly, fb.alphaOnly);
  const full = ratioSimilarity(fa.lower, fb.lower);

  if (fa.noDigits === fb.noDigits && fa.noDigits.length > 0) reasons.push('same text with digits stripped');
  if (fa.alphaOnly === fb.alphaOnly && fa.alphaOnly.length >= 4) reasons.push('same alpha-only (letters)');

  // Weight: digit-stripped and alpha-only are the main “merchant core” signals; full string catches spacing/punct.
  let score = 0.38 * nd + 0.42 * al + 0.2 * full;
  if (fa.noDigits === fb.noDigits && fa.noDigits.length > 0) score = Math.max(score, 0.88);
  if (fa.alphaOnly === fb.alphaOnly && fa.alphaOnly.length >= 5) score = Math.max(score, 0.86);

  return { score, nd, al, full, reasons };
}

class UnionFind {
  constructor(n) {
    this.p = Array.from({ length: n }, (_, i) => i);
    this.r = new Array(n).fill(0);
  }
  find(i) {
    if (this.p[i] !== i) this.p[i] = this.find(this.p[i]);
    return this.p[i];
  }
  union(a, b) {
    let x = this.find(a);
    let y = this.find(b);
    if (x === y) return;
    if (this.r[x] < this.r[y]) [x, y] = [y, x];
    this.p[y] = x;
    if (this.r[x] === this.r[y]) this.r[x] += 1;
  }
}

/**
 * @param {string[]} accountsIdentifiers
 * @param {number} minPairScore
 * @param {number} topPairs
 * @param {number} topClusters
 */
function parseArgsAccounts() {
  const list = [];
  const multi = process.argv.filter((a) => a.startsWith('--account='));
  for (const a of multi) {
    const v = a.split('=').slice(1).join('=').trim();
    if (v) list.push(v);
  }
  const csv = getArg('accounts');
  if (csv) {
    for (const x of csv.split(',')) {
      const t = x.trim();
      if (t) list.push(t);
    }
  }
  return list;
}

async function main() {
  const parentOverride = getArg('out');
  const minPairScore = Math.min(1, Math.max(0, parseFloat(getArg('min-score') || '0.78')));
  const topPairs = Math.min(500, Math.max(10, parseInt(getArg('top-pairs') || '50', 10)));
  const topClusters = Math.min(200, Math.max(5, parseInt(getArg('top-clusters') || '40', 10)));
  const includeSameNorm =
    getArg('include-same-norm') === '1' ||
    getArg('include-same-norm') === 'true' ||
    getArg('include-same-norm') === 'yes';

  let dateScope;
  try {
    dateScope = parseDateScope();
  } catch (e) {
    console.error(e.message);
    console.error(
      'Usage: [--since=YYYY-MM-DD [--until=YYYY-MM-DD] | --after=…]  OR  --from=YYYY-MM-DD --to=YYYY-MM-DD]  AND  --account=Id [--account=…]  OR  --accounts=a,b,c'
    );
    process.exit(1);
  }

  const accountsIdentifiers = parseArgsAccounts();
  if (accountsIdentifiers.length === 0) {
    console.error('Need at least one account: --account=Identifier or --accounts=a,b,c');
    process.exit(1);
  }

  const knex = getKnex();
  const dataDir = parentOverride ? path.resolve(parentOverride) : getDataDir();
  const reportRoot = path.join(dataDir, 'low-hanging-fruit-reports', stampFolderName());
  const dirAccount = path.join(reportRoot, 'by-account');
  fs.mkdirSync(dirAccount, { recursive: true });

  const dateNote = dateScope ? dateScope.label : 'all dates';

  const formatRows = await knex('parse_formats').select('id', 'identifier');
  const formatIdToIdent = new Map(formatRows.map((f) => [f.id, f.identifier]));

  const summaryLines = [];
  const sum = (s) => summaryLines.push(s);

  sum('MyKnees low-hanging fruit report — SUMMARY');
  sum(`Generated: ${new Date().toISOString()}`);
  sum(`Output folder: ${reportRoot}`);
  sum(`Scope: ${dateNote}`);
  sum(
    `Params: min-pair-score≥${minPairScore.toFixed(2)}  top-pairs=${topPairs}  top-clusters=${topClusters}` +
      (includeSameNorm ? '  include-same-norm=yes' : '  parser-gap-only (norm must differ per pair)')
  );
  sum('');
  sum('Similarity score blends: digit-stripped match, alpha-only (letters) match, full lowercased string.');
  sum('Clusters: pairs above min score are unioned (transitive — a chain A~B~C appears as one cluster).');
  sum('  Ranked by “duplicate tax” (tx rows − largest single raw). Compare merge% / txMerge% in normalization-report.');
  if (!includeSameNorm) {
    sum('Default: only pairs where normalized_value already differs — true parser / mapping gaps (not case-only dupes).');
  }
  sum('');
  sum('── Reports requested ──');
  for (const id of accountsIdentifiers) sum(`  - ${id}`);
  sum('');

  for (const ident of accountsIdentifiers) {
    const acc = await knex('accounts').select('id', 'identifier', 'name', 'parse_format_id').where({ identifier: ident }).first();
    if (!acc) {
      sum(`ERROR: account not found: ${ident}`);
      fs.writeFileSync(path.join(dirAccount, `${ident}.txt`), `Account not found: ${ident}\n`, 'utf8');
      continue;
    }

    let txq = knex('transactions').where('account_id', acc.id).select('description');
    if (dateScope) {
      txq = txq.where('date', '>=', dateScope.min);
      if (dateScope.max) txq = txq.andWhere('date', '<=', dateScope.max);
    }
    const txRows = await txq;

    /** @type {Map<string, number>} */
    const descCounts = new Map();
    for (const { description } of txRows) {
      descCounts.set(description, (descCounts.get(description) || 0) + 1);
    }

    if (descCounts.size === 0) {
      sum(`${ident}: (no transactions in scope)`);
      fs.writeFileSync(
        path.join(dirAccount, `${ident}.txt`),
        `No transactions in scope for ${ident}.\nDate: ${dateNote}\n`,
        'utf8'
      );
      continue;
    }

    const descriptions = [...descCounts.keys()];
    let domPid;
    let domFid;
    if (acc.parse_format_id) {
      domPid = Number(acc.parse_format_id);
      domFid = formatIdToIdent.get(domPid) || '?';
    } else {
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
        sum(`${ident}: (no classification_raw_values match)`);
        fs.writeFileSync(
          path.join(dirAccount, `${ident}.txt`),
            `No classification_raw_values matched transaction descriptions for ${ident}.\n`,
          'utf8'
        );
        continue;
      }

      domPid = Number(best.parse_format_id);
      domFid = formatIdToIdent.get(domPid) || '?';
    }

    const subRaws = await knex('classification_raw_values as rv')
      .join('classification_normalized as n', 'n.raw_value_id', 'rv.id')
      .where('rv.parse_format_id', domPid)
      .whereIn('rv.raw_value', descriptions)
      .select('rv.raw_value', 'n.normalized_value');

    if (subRaws.length === 0) {
      sum(`${ident}: (no classification rows for parse format ${domFid} — run set-account-parse-format)`);
      fs.writeFileSync(
        path.join(dirAccount, `${ident}.txt`),
        `No classification rows for format "${domFid}". Run:\n` +
          `  node scripts/set-account-parse-format.js --account=${ident} --parse-format=${domFid}\n`,
        'utf8'
      );
      continue;
    }

    /** @type {Map<string, string>} */
    const rawToNorm = new Map();
    for (const { raw_value, normalized_value } of subRaws) {
      rawToNorm.set(raw_value, normalized_value);
    }

    const raws = [...descCounts.keys()].filter((r) => rawToNorm.has(r));
    const n = raws.length;
    const index = new Map(raws.map((r, i) => [r, i]));

    /** @type {Array<{ a: string, b: string, score: number, nd: number, al: number, full: number, reasons: string[] }>} */
    const pairs = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ra = raws[i];
        const rb = raws[j];
        const na = rawToNorm.get(ra);
        const nb = rawToNorm.get(rb);
        if (!includeSameNorm && na === nb) continue;
        const ps = pairScore(ra, rb);
        if (ps.score >= minPairScore) {
          pairs.push({ a: ra, b: rb, score: ps.score, nd: ps.nd, al: ps.al, full: ps.full, reasons: ps.reasons });
        }
      }
    }

    pairs.sort((x, y) => y.score - x.score);

    const uf = new UnionFind(n);
    for (const p of pairs) {
      if (p.score < minPairScore) break;
      uf.union(index.get(p.a), index.get(p.b));
    }

    /** @type {Map<number, number[]>} */
    const comp = new Map();
    for (let i = 0; i < n; i++) {
      const root = uf.find(i);
      if (!comp.has(root)) comp.set(root, []);
      comp.get(root).push(i);
    }

    /** @type {Array<{ members: string[], txSum: number, waste: number, minScoreInCluster: number }>} */
    const clusterStats = [];
    for (const idxs of comp.values()) {
      if (idxs.length < 2) continue;
      const members = idxs.map((i) => raws[i]);
      let txSum = 0;
      let maxCnt = 0;
      for (const r of members) {
        const c = descCounts.get(r) || 0;
        txSum += c;
        if (c > maxCnt) maxCnt = c;
      }
      const waste = txSum - maxCnt;

      let minPair = 1;
      for (let ii = 0; ii < members.length; ii++) {
        for (let jj = ii + 1; jj < members.length; jj++) {
          const ps = pairScore(members[ii], members[jj]);
          if (ps.score < minPair) minPair = ps.score;
        }
      }
      clusterStats.push({ members, txSum, waste, minScoreInCluster: minPair });
    }

    clusterStats.sort((a, b) => b.waste - a.waste || b.txSum - a.txSum);

    const topPairRows = [];
    for (const p of pairs.slice(0, topPairs * 3)) {
      const ca = descCounts.get(p.a) || 0;
      const cb = descCounts.get(p.b) || 0;
      const impact = Math.min(ca, cb);
      topPairRows.push({ ...p, ca, cb, impact });
    }
    topPairRows.sort((a, b) => b.score * Math.log(1 + a.impact) - a.score * Math.log(1 + b.impact));
    const topPairsFinal = topPairRows.slice(0, topPairs);

    const lines = [];
    const out = (s) => lines.push(s);
    out('MyKnees low-hanging fruit report (detail)');
    out(`Account: ${ident} (${acc.name || ident})`);
    out(`Dominant parse format for descriptions in scope: ${domFid}`);
    out(`Date filter: ${dateNote}`);
    out(`Generated: ${new Date().toISOString()}`);
    out('');
    out('Similarity: blended score on raw text; clusters are merge candidates (parser outputs that still look alike).');
    out('');
    out('── Clusters (post-parser labels in the DB today) ──');
    out('Each ×N line is the normalized_value the system stores now; N = transaction rows hitting that label.');
    out('“(K× normalized from e.g. …)” = K distinct bank descriptions already map to this label; one sample string shown.');
    out('“(from e.g. …)” on a lone line = one bank string scrubbed into this label (digits/punct stripped, etc.).');
    if (!includeSameNorm) {
      out('Only groups where at least two different parser labels appear (further merge is the work item).');
    } else {
      out('include-same-norm=yes: also lists groups that already share one label.');
    }
    out('');
    out(`Distinct raw descriptions in scope: ${n}`);
    out(`Transactions in scope: ${txRows.length}`);
    out(`Pairs ≥ ${minPairScore.toFixed(2)}: ${pairs.length}`);
    out(`Merge-suggest clusters (size≥2): ${clusterStats.length}`);
    out('');

    out(`── Top ${Math.min(topClusters, clusterStats.length)} clusters by “duplicate tax” (tx − largest bucket) ──`);
    const showCl = clusterStats.slice(0, topClusters);
    if (showCl.length === 0) {
      out('(none above threshold — try lowering --min-score)');
    } else {
      for (let ci = 0; ci < showCl.length; ci++) {
        const c = showCl[ci];
        out('');
        const normKinds = new Set(c.members.map((r) => rawToNorm.get(r)));
        out(
          `Cluster ${ci + 1}  (${c.members.length} distinct bank strings, ${normKinds.size} distinct parser norms, ${c.txSum} tx rows, duplicate-tax≈${c.waste}, min pairwise≈${c.minScoreInCluster.toFixed(3)})`
        );
        for (const cl of formatClusterLines(c.members, descCounts, rawToNorm)) {
          out(cl);
        }
      }
    }

    out('');
    out(`── Top ${topPairsFinal.length} similar pairs (score × impact) — parser labels only ──`);
    for (let pi = 0; pi < topPairsFinal.length; pi++) {
      const p = topPairsFinal[pi];
      const n1 = rawToNorm.get(p.a) || '?';
      const n2 = rawToNorm.get(p.b) || '?';
      out('');
      out(`Pair ${pi + 1}  score=${p.score.toFixed(3)}  tx ${p.ca} vs ${p.cb}`);
      if (p.reasons.length) out(`  ${p.reasons.join('; ')}`);
      out(`  ×${p.ca} ${n1}`);
      out(`  ×${p.cb} ${n2}`);
    }

    out('');
    out('── Next steps ──');
    out('  1. Adjust parsers or mapping tables so these raws collapse to one normalized label.');
    out('  2. npm run recompute-normalized (or make recompute-normalized), then normalization-report + this report again.');
    out('');

    fs.writeFileSync(path.join(dirAccount, `${ident}.txt`), lines.join('\n') + '\n', 'utf8');

    sum(
      `${ident.padEnd(22)}  tx=${String(txRows.length).padStart(5)}  distinct=${String(n).padStart(4)}  ` +
        `pairs≥${minPairScore.toFixed(2)}:${String(pairs.length).padStart(5)}  clusters:${String(clusterStats.length).padStart(4)}  format:${domFid}`
    );
  }

  fs.writeFileSync(path.join(reportRoot, 'summary.txt'), summaryLines.join('\n') + '\n', 'utf8');

  const combined = [
    summaryLines.join('\n'),
    '\n\n========== BY-ACCOUNT (concatenated) ==========\n\n',
    ...accountsIdentifiers.map((id) => {
      const p = path.join(dirAccount, `${id}.txt`);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    }),
  ].join('\n');
  fs.writeFileSync(path.join(reportRoot, 'full-report.txt'), combined, 'utf8');

  console.error('Wrote:', reportRoot);
  console.error('  summary.txt   full-report.txt   by-account/<Identifier>.txt');
  console.error('Scope:', dateNote);
  console.log(summaryLines.join('\n'));
  await knex.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
