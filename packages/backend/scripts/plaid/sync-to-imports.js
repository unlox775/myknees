#!/usr/bin/env node
/**
 * Incremental Plaid transactions/sync → CSV files compatible with import-transaction-records.js,
 * then optionally run that importer (same dedupe + transition-day rules as manual CSV).
 *
 * Prerequisites:
 *   - secrets/plaid-items.json from link-local-server.js
 *   - secrets/plaid-account-map.json mapping plaid_account_id → { myknees_account, import_format }
 *   - MyKnees accounts already exist (make add-account …)
 *
 * Usage (from packages/backend):
 *   PLAID_CLIENT_ID=… PLAID_SECRET=… PLAID_ENV=production npm run plaid:sync
 *
 * Env:
 *   NO_IMPORT=1  — only write CSVs under imports/, do not run importer
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createPlaidClient } = require('./lib/plaid-client');
const { ensureSecretsDir, itemsPath, accountMapPath, cursorsPath } = require('./lib/paths');
const { csvLine } = require('./lib/csv');

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const IMPORT_SCRIPT = path.join(BACKEND_ROOT, 'scripts', 'import-transaction-records.js');

function readJson(p) {
  if (!fs.existsSync(p)) {
    throw new Error('Missing file: ' + p);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadCursors() {
  const p = cursorsPath();
  if (!fs.existsSync(p)) return {};
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return j.cursors && typeof j.cursors === 'object' ? j.cursors : {};
  } catch (_) {
    return {};
  }
}

function saveCursors(cursors) {
  ensureSecretsDir();
  fs.writeFileSync(cursorsPath(), JSON.stringify({ version: 1, cursors }, null, 2), 'utf8');
}

function descriptionFromPlaid(t) {
  const m = (t.merchant_name || '').trim();
  const n = (t.name || '').trim();
  return m || n || 'Unknown';
}

function headerForFormat(format) {
  if (format === 'ally_bank') return csvLine(['Date', 'Description', 'Amount']);
  if (format === 'capital_one' || format === 'chase_visa') {
    return csvLine([
      'Transaction Date',
      'Posted Date',
      'Card No.',
      'Description',
      'Category',
      'Debit',
      'Credit',
    ]);
  }
  throw new Error('Unknown import_format (use ally_bank, capital_one, or chase_visa): ' + format);
}

/** Capital One importer expects Transaction Date in column named "Transaction Date" — order fixed. */
function rowCapitalOneFixed(t) {
  const desc = descriptionFromPlaid(t);
  const date = (t.date || '').trim();
  const amt = Number(t.amount);
  if (!date || !Number.isFinite(amt)) return null;
  let debit = '';
  let credit = '';
  if (amt > 0) debit = String(amt);
  else if (amt < 0) credit = String(-amt);
  else return null;
  return csvLine([date, '', '', desc, '', debit, credit]);
}

function rowForFormatFixed(t, format) {
  if (format === 'ally_bank') {
    const desc = descriptionFromPlaid(t);
    const date = (t.date || '').trim();
    const amt = Number(t.amount);
    if (!date || !Number.isFinite(amt)) return null;
    return csvLine([date, desc, String(-amt)]);
  }
  if (format === 'capital_one' || format === 'chase_visa') return rowCapitalOneFixed(t);
  return null;
}

async function syncItem(client, item, accountMap, cursors) {
  const access_token = item.access_token;
  const item_id = item.item_id;
  if (!access_token || !item_id) throw new Error('Invalid item (missing access_token or item_id)');

  let cursor = cursors[item_id] || undefined;
  const allAdded = [];

  while (true) {
    const { data } = await client.transactionsSync({
      access_token,
      cursor: cursor || undefined,
    });
    for (const t of data.added || []) {
      if (t.pending) continue;
      allAdded.push(t);
    }
    cursor = data.next_cursor;
    if (!data.has_more) break;
  }

  cursors[item_id] = cursor || cursors[item_id];
  const byTarget = new Map();

  for (const t of allAdded) {
    const pid = t.account_id;
    const conf = accountMap[pid];
    if (!conf) continue;
    const { myknees_account, import_format } = conf;
    if (!myknees_account || !import_format) continue;
    const key = `${myknees_account}\t${import_format}`;
    if (!byTarget.has(key)) byTarget.set(key, { myknees_account, import_format, lines: [] });
    const row = rowForFormatFixed(t, import_format);
    if (row) byTarget.get(key).lines.push(row);
  }

  return { byTarget, addedCount: allAdded.length };
}

function writeImportCsv(target, lines) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safe = target.myknees_account.replace(/[^\w-]+/g, '_');
  const name = `Plaid_sync_${safe}_${stamp}.csv`;
  const importsDir = path.join(BACKEND_ROOT, 'imports');
  if (!fs.existsSync(importsDir)) fs.mkdirSync(importsDir, { recursive: true });
  const outPath = path.join(importsDir, name);
  const body = [headerForFormat(target.import_format), ...lines].join('\n') + '\n';
  fs.writeFileSync(outPath, body, 'utf8');
  return outPath;
}

function runImport(csvPath, format, account) {
  execFileSync(
    process.execPath,
    [IMPORT_SCRIPT, `--format=${format}`, `--account=${account}`, csvPath],
    { stdio: 'inherit', cwd: BACKEND_ROOT }
  );
}

async function main() {
  ensureSecretsDir();
  const itemsDoc = readJson(itemsPath());
  const mapDoc = readJson(accountMapPath());
  const items = itemsDoc.items || [];
  const accountMap = mapDoc.map || mapDoc.by_plaid_account_id || {};
  if (items.length === 0) throw new Error('No items in plaid-items.json — run link-local-server.js first');
  if (Object.keys(accountMap).length === 0) {
    throw new Error('No mappings in plaid-account-map.json — see docs/plaid-automatic-import.md');
  }

  const client = createPlaidClient();
  const cursors = loadCursors();
  let totalAdded = 0;

  for (const item of items) {
    const { byTarget, addedCount } = await syncItem(client, item, accountMap, cursors);
    totalAdded += addedCount;
    console.log('Item', item.item_id, '| added (non-pending) from Plaid this run:', addedCount);
    for (const [, payload] of byTarget) {
      if (payload.lines.length === 0) {
        console.log('  →', payload.myknees_account, payload.import_format, '| 0 new rows after mapping');
        continue;
      }
      const csvPath = writeImportCsv(payload, payload.lines);
      console.log('  → wrote', csvPath, '(' + payload.lines.length + ' rows)');
      if (!process.env.NO_IMPORT) {
        runImport(csvPath, payload.import_format, payload.myknees_account);
      }
    }
  }

  saveCursors(cursors);
  console.log('Done. Updated cursors in secrets/plaid-sync-cursors.json');
  console.log('Plaid reported', totalAdded, 'added transactions total (all accounts on item, before map filter)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
