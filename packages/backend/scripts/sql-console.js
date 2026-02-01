#!/usr/bin/env node
/**
 * SQL console for SQLite or PostgreSQL.
 * - Interactive: multi-line input until semicolon; command history; table or CSV output.
 * - CLI: pass query as first arg; optional --out <file>; output is CSV.
 *
 * Usage:
 *   node scripts/sql-console.js
 *   node scripts/sql-console.js "SELECT * FROM accounts"
 *   node scripts/sql-console.js "SELECT * FROM accounts" --out results.csv
 *   npm run sql
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { getKnex } = require('../src/db/knex');
const { getKnexConfig, getMykneesRoot } = require('../src/config');

const MAX_ROWS = parseInt(process.env.SQL_CONSOLE_MAX_ROWS || '200', 10);

function formatCell(val) {
  if (val === null || val === undefined) return '';
  if (Buffer.isBuffer(val)) return val.toString('utf8');
  if (typeof val === 'object' && typeof val.toISOString === 'function') return val.toISOString();
  return String(val);
}

function escapeCsvCell(val) {
  const s = formatCell(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function headerOnlyCsv(cols) {
  if (!cols || cols.length === 0) return '';
  return cols.map(escapeCsvCell).join(',');
}

function rowsToCsv(rows, maxRows) {
  if (!rows || rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const header = cols.map(escapeCsvCell).join(',');
  const n = maxRows != null ? Math.min(rows.length, maxRows) : rows.length;
  const lines = [header];
  for (let i = 0; i < n; i++) {
    lines.push(cols.map((c) => escapeCsvCell(rows[i][c])).join(','));
  }
  if (maxRows != null && rows.length > maxRows) {
    lines.push('# ... ' + (rows.length - maxRows) + ' more rows (' + rows.length + ' total)');
  }
  return lines.join('\n');
}

function formatRows(rows, maxRows) {
  if (!rows || rows.length === 0) return { text: '(0 rows)', truncated: false };
  const cols = Object.keys(rows[0]);
  const colWidths = cols.map((c) =>
    Math.max(c.length, ...rows.slice(0, maxRows).map((r) => formatCell(r[c]).length))
  );
  const sep = colWidths.map((w) => '-'.repeat(Math.min(w, 40))).join('-+-');
  const header = cols
    .map((c, i) => String(c).slice(0, 40).padEnd(Math.min(colWidths[i], 40)))
    .join(' | ');
  const lines = [header, sep];
  const n = Math.min(rows.length, maxRows);
  for (let i = 0; i < n; i++) {
    const row = rows[i];
    const line = cols
      .map((c, j) => formatCell(row[c]).slice(0, 40).padEnd(Math.min(colWidths[j], 40)))
      .join(' | ');
    lines.push(line);
  }
  const truncated = rows.length > maxRows;
  if (truncated) lines.push(`... ${rows.length - maxRows} more rows (${rows.length} total)`);
  return { text: lines.join('\n'), truncated };
}

/**
 * Normalize knex.raw() result to rows array.
 * - better-sqlite3/sqlite3: raw() returns the rows array directly [ { id: 1, ... }, ... ].
 * - pg: raw() returns { rows: [...] }.
 * - Some drivers return [ rowsArray, meta ] so result[0] is the rows.
 */
function rawResultToRows(result) {
  if (result == null) return [];
  if (result.rows != null && Array.isArray(result.rows)) return result.rows;
  if (!Array.isArray(result)) return [];
  if (result.length === 0) return [];
  const first = result[0];
  if (Array.isArray(first)) return first;
  if (typeof first === 'object' && first !== null && !Array.isArray(first)) return result;
  return result;
}

async function runQuery(knex, sql, debugResult) {
  const trimmed = sql.trim();
  if (!trimmed) return { rows: [], rowCount: 0 };
  const result = await knex.raw(trimmed);
  if (debugResult) {
    const t = result == null ? 'null' : typeof result;
    const isArr = Array.isArray(result);
    const len = isArr ? result.length : (result?.rows?.length ?? 'n/a');
    const firstKeys = isArr && result.length > 0 && typeof result[0] === 'object'
      ? Object.keys(result[0]).join(',')
      : (result?.rows?.[0] ? Object.keys(result.rows[0]).join(',') : 'n/a');
    console.error('[debug] raw result: type=%s isArray=%s length=%s firstRowKeys=%s', t, isArr, len, firstKeys);
  }
  const arr = rawResultToRows(result);
  return { rows: arr, rowCount: arr.length };
}

/** For 0-row SELECT, get column names by re-running with LIMIT 1. Returns null if not possible. */
async function getColumnsForEmptyResult(knex, sql) {
  const trimmed = sql.trim().replace(/;\s*$/, '');
  const upper = trimmed.toUpperCase();
  if (!upper.startsWith('SELECT')) return null;
  const limitOne = trimmed + ' LIMIT 1';
  try {
    const { rows } = await runQuery(knex, limitOne);
    if (rows && rows.length > 0) return Object.keys(rows[0]);
  } catch (_) {
    // e.g. query has no FROM, or LIMIT 1 breaks it
  }
  return null;
}

function printDebugStderr(cfg) {
  console.error('[debug] DB path:', cfg.client === 'better-sqlite3' && cfg.connection?.filename ? cfg.connection.filename : '(not SQLite file)');
  console.error('[debug] client:', cfg.client);
  if (cfg.client === 'better-sqlite3') {
    try {
      const root = getMykneesRoot();
      console.error('[debug] DATA_STORE_ROOT:', process.env.DATA_STORE_ROOT ?? '(not set, using ~/.myknees/backend)');
      console.error('[debug] resolved data root:', root);
      console.error('[debug] SQLite schema: main (single file has one schema; no schema selection needed)');
    } catch (e) {
      console.error('[debug] getMykneesRoot:', e.message);
    }
  }
  console.error('[debug] HOME:', process.env.HOME ?? process.env.USERPROFILE ?? '(unset)');
}

function runCliMode() {
  const args = process.argv.slice(2);
  let outFile = null;
  let debug = false;
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--debug') {
      debug = true;
      continue;
    }
    if (args[i] === '--out' && args[i + 1]) {
      outFile = args[i + 1];
      i++;
      continue;
    }
    if (!args[i].startsWith('--')) positionals.push(args[i]);
  }
  const query = (positionals[0] || '').trim();
  if (!query) {
    console.error('Usage: node scripts/sql-console.js "<SQL>" [--out file.csv] [--debug]');
    process.exit(1);
  }
  const cfg = getKnexConfig();
  if (cfg.client === 'better-sqlite3' && cfg.connection?.filename) {
    console.error('DB:', cfg.connection.filename);
  }
  if (debug) printDebugStderr(cfg);
  const knex = getKnex();
  runQuery(knex, query, debug)
    .then(async ({ rows }) => {
      const n = rows && rows.length ? rows.length : 0;
      let cols = n > 0 ? Object.keys(rows[0]) : [];
      if (n === 0) {
        const emptyCols = await getColumnsForEmptyResult(knex, query);
        if (emptyCols && emptyCols.length > 0) cols = emptyCols;
      }
      console.error('Rows:', n);
      if (cols.length > 0) console.error('Columns:', cols.join(', '));
      let csv = rowsToCsv(rows, null);
      if (!csv && cols.length > 0) csv = headerOnlyCsv(cols);
      if (outFile) {
        const resolved = path.isAbsolute(outFile) ? outFile : path.resolve(process.cwd(), outFile);
        fs.writeFileSync(resolved, csv, 'utf8');
        console.error('Wrote', n, 'rows to', resolved);
      } else {
        if (csv) console.log(csv);
      }
      return knex.destroy();
    })
    .catch((err) => {
      console.error(err.message || err);
      knex.destroy().then(() => process.exit(1));
    });
}

function mainInteractive() {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug');
  const knex = getKnex();
  try {
    const cfg = getKnexConfig();
    if (cfg.client === 'better-sqlite3' && cfg.connection?.filename) {
      console.log('DB:', cfg.connection.filename);
    } else {
      console.log('DB:', cfg.client === 'pg' ? 'PostgreSQL' : 'SQLite');
    }
    if (debug) printDebugStderr(cfg);
  } catch (_) {
    console.log('DB: (config not available)');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'sql> ',
    historySize: 100,
  });

  let buffer = '';

  console.log('SQL console. Multi-line: type until line ends with ; then Enter. exit/quit to exit.');
  console.log('Max rows displayed:', MAX_ROWS, '(SQL_CONSOLE_MAX_ROWS).');
  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      rl.close();
      await knex.destroy();
      process.exit(0);
      return;
    }

    buffer += (buffer ? '\n' : '') + line;

    if (!buffer.trim()) {
      rl.prompt();
      return;
    }

    if (!buffer.trimEnd().endsWith(';')) {
      rl.prompt();
      return;
    }

    const sql = buffer.trim().replace(/;\s*$/, '');
    buffer = '';

    try {
      const { rows, rowCount } = await runQuery(knex, sql);
      const { text } = formatRows(rows, MAX_ROWS);
      console.log(text);
      if (sql && rowCount === 0 && (!rows || rows.length === 0)) console.log('(0 rows)');
    } catch (err) {
      console.error(err.message || err);
    }
    rl.prompt();
  }).on('close', () => {
    knex.destroy().then(() => process.exit(0));
  });
}

function main() {
  const args = process.argv.slice(2);
  let hasQueryArg = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--debug') continue;
    if (args[i] === '--out') {
      i++;
      continue;
    }
    if (!args[i].startsWith('--') && args[i].trim().length > 0) {
      hasQueryArg = true;
      break;
    }
  }
  if (hasQueryArg) {
    runCliMode();
    return;
  }
  mainInteractive();
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
