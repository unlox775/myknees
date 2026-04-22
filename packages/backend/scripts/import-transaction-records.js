#!/usr/bin/env node
/**
 * Single-pass import from a transaction CSV: (1) classification, (2) transaction rows.
 *
 * 1. Classification: Extract distinct descriptions from the CSV, insert into
 *    classification_raw_values, run the format parser, cache in classification_normalized.
 * 2. Transaction rows: Insert into the transactions table with day-by-day dedupe and
 *    transition-day merge (see below).
 *
 * No separate "import transactions for classification only" step — one CSV, one command.
 *
 * Transaction-record rules:
 * - (date, description, amount) is NOT a unique key: you can have three McDonald's $10.02
 *   on the same day. Dedupe is day-by-day: we compare counts per (date, description, amount)
 *   in the DB vs the file; on days we're allowed to merge we insert only the delta.
 * - If the file's date range does not overlap any existing dates for this account → insert
 *   all rows.
 * - If it overlaps: only "transition days" (in the existing DB) may be amended. Transition
 *   days are determined from the existing account dates using a gap threshold derived from
 *   the import: if the import has no missing days (data every day) we use gap = 3; if the
 *   import has gaps, we take the longest run of consecutive missing days in the import and
 *   set gap = longestGap * 3 (e.g. 10-day gap → gap = 30). A day in the DB is a transition day if it has at least
 *   that many consecutive days with no data after it (end of range) or before it (start).
 *   On transition days we merge (insert count delta). On any day that already has data and
 *   is not a transition day we skip. Days with no existing data are always allowed (insert
 *   all rows for that day).
 *
 * Usage:
 *   node scripts/import-transaction-records.js --format=ally_bank --account=Ally_Bank path/to/ally-bills.csv
 *
 * --format: ally_bank | capital_one | chase_visa | costco_receipts
 * CSV columns for chase_visa match Capital One exports (same as capital_one).
 * If the account has parse_format_id set, classification uses that format even when --format=capital_one.
 * --account: account identifier or numeric id
 */

const path = require('path');
const fs = require('fs');
const { getKnex } = require('../src/db/knex');
const { getParser } = require('../src/classification');
const { upsertClassificationForRaw } = require('../src/classification/upsert-classification');
const { nowEpoch, validateTransactionDate, excelSerialToDateString } = require('../src/db/dates');

const DEFAULT_GAP_DAYS = 3;

// CSV column names per format (date, description, amount)
const FORMAT_COLUMNS = {
  ally_bank: { date: 'Date', description: 'Description', amount: 'Amount' },
  /** Workbook export uses Line Price; website CSV uses Debit + Credit (positive numbers). */
  capital_one: { date: 'Transaction Date', description: 'Description', amount: 'Line Price' },
  chase_visa: { date: 'Transaction Date', description: 'Description', amount: 'Line Price' },
  costco_receipts: { date: 'Date', description: 'Product Code', amount: 'Raw price' },
};

function trimHeader(h) {
  return String(h || '').trim();
}

/**
 * Capital One: accept workbook column Line Price, or website download Debit/Credit.
 * Amount sign matches existing imports: purchases negative, payments/credits positive (credit − debit).
 */
function resolveCapitalOneColumns(header) {
  const idx = (name) => header.findIndex((h) => trimHeader(h) === name);
  const dateCol = idx('Transaction Date');
  const descCol = idx('Description');
  if (dateCol < 0 || descCol < 0) return null;
  const linePriceCol = idx('Line Price');
  if (linePriceCol >= 0) {
    return { mode: 'line_price', dateCol, descCol, linePriceCol };
  }
  const debitCol = idx('Debit');
  const creditCol = idx('Credit');
  if (debitCol >= 0 && creditCol >= 0) {
    return { mode: 'debit_credit', dateCol, descCol, debitCol, creditCol };
  }
  return null;
}

/** @param {ReturnType<typeof resolveCapitalOneColumns>} spec @param {string[]} r */
function capitalOneRowAmount(spec, r) {
  if (!spec) return null;
  if (spec.mode === 'line_price') return parseAmount(r[spec.linePriceCol]);
  const debit = parseAmount(r[spec.debitCol]);
  const credit = parseAmount(r[spec.creditCol]);
  const d = debit != null ? debit : 0;
  const c = credit != null ? credit : 0;
  if (d === 0 && c === 0) return null;
  return c - d;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (inQuotes && content[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && (c === ',' || c === '\n' || c === '\r')) {
      if (c === ',') {
        row.push(cell.trim());
        cell = '';
      } else {
        row.push(cell.trim());
        cell = '';
        if (row.some((x) => x !== '')) rows.push(row);
        row = [];
        if (c === '\r' && content[i + 1] === '\n') i++;
      }
    } else {
      cell += c;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    if (row.some((x) => x !== '')) rows.push(row);
  }
  return rows;
}

/** Parse amount: allow "11.49 Y" or "-114.19" → number */
function parseAmount(s) {
  if (s == null || s === '') return null;
  const t = String(s).trim().replace(/\s+[A-Za-z]\s*$/, '');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** Longest run of consecutive missing days in sorted YYYY-MM-DD date list. If no gaps, returns 0. */
function getLongestGapInDays(sortedDateStrings) {
  if (sortedDateStrings.length < 2) return 0;
  let maxGap = 0;
  const msPerDay = 86400 * 1000;
  for (let i = 0; i < sortedDateStrings.length - 1; i++) {
    const a = new Date(sortedDateStrings[i] + 'T12:00:00.000Z');
    const b = new Date(sortedDateStrings[i + 1] + 'T12:00:00.000Z');
    const daysBetween = (b - a) / msPerDay;
    const missingDays = Math.max(0, Math.floor(daysBetween) - 1);
    if (missingDays > maxGap) maxGap = missingDays;
  }
  return maxGap;
}

/** Gap size for transition-day detection: 3 if import has no gaps, else longest gap in import × 3. */
function getGapDaysFromImport(incomingDates) {
  const longestGap = getLongestGapInDays(incomingDates);
  return longestGap === 0 ? DEFAULT_GAP_DAYS : longestGap * 3;
}

/** Transition days in existing DB: end of range (no data in next gapDays) or start of range (no data in previous gapDays). */
function getTransitionDays(sortedDates, gapDays) {
  if (sortedDates.length === 0) return new Set();
  const transition = new Set();
  for (const d of sortedDates) {
    const next = sortedDates.find((x) => x > d);
    const prev = sortedDates.slice().reverse().find((x) => x < d);
    const dDate = new Date(d + 'T12:00:00.000Z');
    let isEnd = true;
    if (next) {
      const nextDate = new Date(next + 'T12:00:00.000Z');
      const daysDiff = (nextDate - dDate) / (86400 * 1000);
      if (daysDiff <= gapDays) isEnd = false;
    }
    if (isEnd) transition.add(d);
    let isStart = true;
    if (prev) {
      const prevDate = new Date(prev + 'T12:00:00.000Z');
      const daysDiff = (dDate - prevDate) / (86400 * 1000);
      if (daysDiff <= gapDays) isStart = false;
    }
    if (isStart) transition.add(d);
  }
  return transition;
}

/** Count per (date, description, amount) → Map<date, Map<key, count>>. key = description + \t + amount */
function countByDateAndKey(rows) {
  const byDate = new Map();
  for (const r of rows) {
    const key = `${r.description}\t${r.amount}`;
    if (!byDate.has(r.date)) byDate.set(r.date, new Map());
    const keyCount = byDate.get(r.date);
    keyCount.set(key, (keyCount.get(key) || 0) + 1);
  }
  return byDate;
}

async function runClassification(knex, formatId, distinctDescriptions, ts) {
  if (!getParser(formatId)) return { insertedRaw: 0, insertedNorm: 0, updatedNorm: 0 };
  let insertedRaw = 0;
  let insertedNorm = 0;
  let updatedNorm = 0;
  for (const rawValue of distinctDescriptions) {
    const r = await upsertClassificationForRaw(knex, formatId, rawValue, ts);
    if (r.insertedRaw) insertedRaw++;
    if (r.insertedNorm) insertedNorm++;
    if (r.updatedNorm) updatedNorm++;
  }
  return { insertedRaw, insertedNorm, updatedNorm };
}

async function main() {
  const args = process.argv.slice(2);
  const formatArg = args.find((a) => a.startsWith('--format='));
  const accountArg = args.find((a) => a.startsWith('--account='));
  const csvPath = args.find((a) => !a.startsWith('--') && a.endsWith('.csv'));
  if (!formatArg || !accountArg || !csvPath) {
    console.error(
      'Usage: node scripts/import-transaction-records.js --format=ally_bank --account=Ally_Bank path/to/file.csv'
    );
    process.exit(1);
  }
  const formatId = formatArg.split('=')[1].trim();
  const accountIdOrIdentifier = accountArg.split('=')[1].trim();
  const cols = FORMAT_COLUMNS[formatId];
  if (!cols) {
    console.error('Unknown format. Use: ally_bank, capital_one, chase_visa, costco_receipts');
    process.exit(1);
  }

  const resolvedPath = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error('File not found:', resolvedPath);
    process.exit(1);
  }

  const knex = getKnex();
  let accountId;
  if (/^\d+$/.test(accountIdOrIdentifier)) {
    const id = parseInt(accountIdOrIdentifier, 10);
    const row = await knex('accounts').where({ id }).first();
    if (!row) {
      console.error('Account not found:', id);
      process.exit(1);
    }
    accountId = row.id;
  } else {
    const row = await knex('accounts').where({ identifier: accountIdOrIdentifier }).first();
    if (!row) {
      console.error('Account not found with identifier:', accountIdOrIdentifier);
      process.exit(1);
    }
    accountId = row.id;
  }

  const accountRow = await knex('accounts').where({ id: accountId }).first();
  let classificationFormatId = formatId;
  if (accountRow && accountRow.parse_format_id) {
    const pf = await knex('parse_formats').where({ id: accountRow.parse_format_id }).first();
    if (pf) classificationFormatId = pf.identifier;
  }
  if (!getParser(classificationFormatId)) {
    console.error('No parser for classification format:', classificationFormatId);
    process.exit(1);
  }
  if (classificationFormatId !== formatId) {
    console.log('Account parse_format override: classification uses', classificationFormatId, '(CSV format', formatId + ')');
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length < 2) {
    console.error('CSV has no data rows');
    process.exit(1);
  }
  const header = rows[0];
  let dateColIdx;
  let descColIdx;
  let amountColIdx = -1;
  /** @type {ReturnType<typeof resolveCapitalOneColumns>} */
  let capitalOneSpec = null;

  if (formatId === 'capital_one' || formatId === 'chase_visa') {
    capitalOneSpec = resolveCapitalOneColumns(header);
    if (!capitalOneSpec) {
      console.error(
        'CSV missing Capital One columns. Need Transaction Date + Description + (Line Price or Debit and Credit). Header:',
        header.join(', ')
      );
      process.exit(1);
    }
    dateColIdx = capitalOneSpec.dateCol;
    descColIdx = capitalOneSpec.descCol;
    if (capitalOneSpec.mode === 'line_price') {
      console.log('Capital One CSV: using Line Price column');
    } else {
      console.log('Capital One CSV: using Debit/Credit columns (amount = credit − debit)');
    }
  } else {
    dateColIdx = header.findIndex((h) => trimHeader(h) === cols.date);
    descColIdx = header.findIndex((h) => trimHeader(h) === cols.description);
    amountColIdx = header.findIndex((h) => trimHeader(h) === cols.amount);
    if (dateColIdx < 0 || descColIdx < 0 || amountColIdx < 0) {
      console.error(
        'CSV missing columns. Expected:',
        cols.date,
        cols.description,
        cols.amount,
        'Header:',
        header.join(', ')
      );
      process.exit(1);
    }
  }

  const ts = nowEpoch();
  const distinctDescriptions = new Set();
  const incoming = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const desc = (r[descColIdx] || '').trim();
    if (desc) distinctDescriptions.add(desc);

    let dateStr = (r[dateColIdx] || '').trim();
    if (!dateStr) continue;
    if (/^\d+(\.\d*)?$/.test(dateStr)) {
      dateStr = excelSerialToDateString(parseFloat(dateStr));
    }
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    const amount =
      formatId === 'capital_one' || formatId === 'chase_visa'
        ? capitalOneRowAmount(capitalOneSpec, r)
        : parseAmount(r[amountColIdx]);
    if (amount == null) continue;
    incoming.push({ date: dateStr, description: desc, amount });
  }

  // --- Pass 1: Classification (distinct descriptions → raw_values + normalized) ---
  const classResult = await runClassification(knex, classificationFormatId, distinctDescriptions, ts);
  console.log(
    'Classification: distinct descriptions',
    distinctDescriptions.size,
    '| new raw',
    classResult.insertedRaw,
    '| new normalized',
    classResult.insertedNorm,
    '| normalized value drift (updated)',
    classResult.updatedNorm ?? 0
  );

  if (incoming.length === 0) {
    console.log('No valid transaction rows to import.');
    await knex.destroy();
    return;
  }

  const incomingDates = [...new Set(incoming.map((x) => x.date))].sort();
  const minDate = incomingDates[0];
  const maxDate = incomingDates[incomingDates.length - 1];

  const gapDays = getGapDaysFromImport(incomingDates);
  const existingRows = await knex('transactions')
    .where({ account_id: accountId })
    .select('date', 'description', 'amount');
  const existingDates = [...new Set(existingRows.map((r) => r.date))].sort();
  const existingDateSet = new Set(existingDates);
  const transitionDays = getTransitionDays(existingDates, gapDays);

  const existingCountByDateAndKey = countByDateAndKey(existingRows);
  const incomingCountByDateAndKey = countByDateAndKey(incoming);

  // Build list of rows to insert: day-by-day, count delta per (description, amount)
  const toInsert = [];
  for (const date of incomingDates) {
    const incomingCounts = incomingCountByDateAndKey.get(date);
    if (!incomingCounts) continue;

    if (!existingDateSet.has(date)) {
      for (const [key, count] of incomingCounts) {
        const lastTab = key.lastIndexOf('\t');
        const description = key.slice(0, lastTab);
        const amount = parseFloat(key.slice(lastTab + 1));
        for (let n = 0; n < count; n++) toInsert.push({ date, description, amount });
      }
      continue;
    }

    if (!transitionDays.has(date)) continue;

    const existingCounts = existingCountByDateAndKey.get(date) || new Map();
    for (const [key, inCount] of incomingCounts) {
      const existCount = existingCounts.get(key) || 0;
      const delta = inCount - existCount;
      if (delta <= 0) continue;
      const lastTab = key.lastIndexOf('\t');
      const description = key.slice(0, lastTab);
      const amount = parseFloat(key.slice(lastTab + 1));
      for (let n = 0; n < delta; n++) toInsert.push({ date, description, amount });
    }
  }

  let inserted = 0;
  for (const row of toInsert) {
    try {
      validateTransactionDate(row.date);
    } catch (_) {
      continue;
    }
    await knex('transactions').insert({
      account_id: accountId,
      date: row.date,
      description: row.description,
      amount: row.amount,
      created_at: ts,
      updated_at: ts,
    });
    inserted++;
  }

  console.log('Transaction records: file date range', minDate, 'to', maxDate);
  console.log('Import longest gap (days):', getLongestGapInDays(incomingDates), '→ gap for transition-day detection:', gapDays);
  console.log('Existing dates in DB:', existingDates.length, '| Transition days (merge allowed):', transitionDays.size);
  console.log('Rows in file:', incoming.length, '| Rows inserted:', inserted);
  await knex.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
