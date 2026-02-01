#!/usr/bin/env node
/**
 * Interactive SQL console for SQLite or PostgreSQL.
 * - Command history (up/down or Ctrl+P / Ctrl+N)
 * - Enter runs query and shows results
 * - If result set > MAX_ROWS (default 200), truncates and shows "N more rows"
 *
 * Usage:
 *   node scripts/sql-console.js
 *   npm run sql
 */

const readline = require('readline');
const { getKnex } = require('../src/db/knex');

const MAX_ROWS = parseInt(process.env.SQL_CONSOLE_MAX_ROWS || '200', 10);

function formatCell(val) {
  if (val === null || val === undefined) return '';
  if (Buffer.isBuffer(val)) return val.toString('utf8');
  if (typeof val === 'object' && typeof val.toISOString === 'function') return val.toISOString();
  return String(val);
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

async function runQuery(knex, sql) {
  const trimmed = sql.trim();
  if (!trimmed) return { rows: [], rowCount: 0 };
  const result = await knex.raw(trimmed);
  // pg: result = { rows: [...] }; better-sqlite3: result = [rows] or rows
  let rows = result?.rows ?? (Array.isArray(result) ? result[0] : result);
  const arr = Array.isArray(rows) ? rows : (rows && typeof rows.length === 'number' ? [...rows] : []);
  return { rows: arr, rowCount: arr.length };
}

function main() {
  const knex = getKnex();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'sql> ',
    historySize: 100,
  });

  console.log('SQL console (SQLite or PostgreSQL). Type SQL and press Enter. exit/quit to exit.');
  console.log('Max rows displayed:', MAX_ROWS, '(set SQL_CONSOLE_MAX_ROWS to change)');
  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      rl.close();
      await knex.destroy();
      process.exit(0);
      return;
    }

    try {
      const { rows, rowCount } = await runQuery(knex, trimmed);
      const { text } = formatRows(rows, MAX_ROWS);
      console.log(text);
      if (trimmed && rowCount === 0 && (!rows || rows.length === 0)) console.log('(0 rows)');
    } catch (err) {
      console.error(err.message || err);
    }
    rl.prompt();
  }).on('close', () => {
    knex.destroy().then(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
