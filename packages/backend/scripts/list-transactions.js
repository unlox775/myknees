#!/usr/bin/env node
/**
 * List transactions for one account in a date range: date, amount, normalized,
 * resolved category, raw description (columns). Default: space-padded table on stdout
 * (pipe to `less -S` to trim long lines and scroll horizontally).
 *
 *   node scripts/list-transactions.js --account=Capital_One --from=2026-01-01 --to=2026-01-31
 *   node scripts/list-transactions.js --account=Ally_Bank --since=2026-01-01 --until=2026-01-31
 *   node scripts/list-transactions.js --account=Capital_One --from=2026-01-01 --to=2026-01-31 --format=csv
 *
 * Omit date flags to include all dates for that account.
 * --format=txt|table (default) or --format=csv. Env FORMAT=csv works with make.
 */

const { getKnex } = require('../src/db/knex');
const { getParser } = require('../src/classification');
const {
  resolveTransactionCategory,
  loadCategoryMaps,
  loadOverrides,
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
    return { min: from, max: to, label: `${from} … ${to}` };
  }

  if (since) {
    validateDate(since, '--since');
    if (until) {
      validateDate(until, '--until');
      if (since > until) throw new Error('--since must be <= --until');
      return { min: since, max: until, label: `${since} … ${until}` };
    }
    return { min: since, max: null, label: `on or after ${since}` };
  }

  if (until) {
    throw new Error('--until requires --since (or use --from/--to).');
  }

  return null;
}

function padCell(s, width) {
  const t = String(s ?? '');
  if (t.length <= width) return t.padEnd(width);
  return t.slice(0, Math.max(1, width - 1)) + '…';
}

function padAmount(n) {
  const v = Number(n);
  const s = Number.isFinite(v) ? v.toFixed(2) : String(n);
  return s.padStart(12);
}

/** CSV cell: quote if needed */
function csvCell(s) {
  const t = String(s ?? '');
  if (/[",\n\r]/.test(t)) {
    return `"${t.replace(/"/g, '""')}"`;
  }
  return t;
}

async function main() {
  const accountArg =
    getArg('account') || process.env.ACCOUNT?.trim() || process.env.ACCOUNTS?.trim()?.split(',')[0]?.trim();
  const formatArg = (getArg('format') || process.env.FORMAT || 'txt').trim().toLowerCase();
  const asCsv = formatArg === 'csv';

  if (!accountArg) {
    console.error('Usage: --account=Identifier (or ACCOUNT= / ACCOUNTS= for make)  plus date scope.');
    console.error(
      '  node scripts/list-transactions.js --account=Capital_One --from=2026-01-01 --to=2026-01-31 [--format=csv]'
    );
    console.error('Pipe table:  … | less -S   (trim long lines; arrow keys scroll horizontally)');
    process.exit(1);
  }

  let dateScope;
  try {
    dateScope = parseDateScope();
  } catch (e) {
    console.error(e.message);
    console.error(
      'Date: (--from=YYYY-MM-DD --to=YYYY-MM-DD)  OR  (--since=… [--until=…])  OR  omit for all dates.'
    );
    process.exit(1);
  }

  const knex = getKnex();
  const acc = await knex('accounts').where({ identifier: accountArg }).first();
  if (!acc) {
    console.error('Account not found:', accountArg);
    process.exit(1);
  }

  const formatId = await resolveFormatIdentifier(knex, acc.id);
  const parser = getParser(formatId);
  const catMap = await loadCategoryMaps(knex);
  const ovrMap = await loadOverrides(knex);

  let q = knex('transactions')
    .where({ account_id: acc.id })
    .select('id', 'date', 'description', 'amount')
    .orderBy('date', 'asc')
    .orderBy('id', 'asc');

  if (dateScope) {
    q = q.where('date', '>=', dateScope.min);
    if (dateScope.max) q = q.andWhere('date', '<=', dateScope.max);
  }

  const rows = await q;

  if (!asCsv) {
    process.stderr.write(
      `# ${acc.identifier}  |  dates: ${dateScope ? dateScope.label : 'all'}  |  rows: ${rows.length}  |  pipe: less -S\n`
    );
    const wDate = 10;
    const wAmt = 12;
    const wNorm = 44;
    const wCat = 24;
    const sep = '  ';
    console.log(
      padCell('date', wDate) +
        sep +
        padCell('amount', wAmt) +
        sep +
        padCell('normalized', wNorm) +
        sep +
        padCell('category', wCat) +
        sep +
        'description'
    );
    console.log(''.padEnd(wDate + wAmt + wNorm + wCat + sep.length * 4 + 20, '-'));
    for (const r of rows) {
      const desc = r.description || '';
      const norm = parser ? parser.normalize(desc) : desc.trim().toLowerCase();
      const { category } = resolveTransactionCategory(formatId, desc, norm, ovrMap, catMap);
      console.log(
        padCell(r.date, wDate) +
          sep +
          padAmount(r.amount) +
          sep +
          padCell(norm, wNorm) +
          sep +
          padCell(category, wCat) +
          sep +
          desc
      );
    }
  } else {
    console.log(['date', 'amount', 'normalized', 'category', 'description'].map(csvCell).join(','));
    for (const r of rows) {
      const desc = r.description || '';
      const norm = parser ? parser.normalize(desc) : desc.trim().toLowerCase();
      const { category } = resolveTransactionCategory(formatId, desc, norm, ovrMap, catMap);
      console.log(
        [r.date, Number(r.amount), norm, category, desc].map(csvCell).join(',')
      );
    }
  }

  await knex.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
