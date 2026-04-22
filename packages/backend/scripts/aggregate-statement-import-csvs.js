#!/usr/bin/env node
/**
 * Concatenate per-month PDF extract CSVs into one import-ready file per stream.
 * Headers must match import-transaction-records.js (ally_bank / capital_one).
 *
 * Writes (next to the monthly CSVs):
 *   allybank_statement_exports/aggregated_ally_char_bills_tithing_import.csv
 *   allybank_statement_exports/aggregated_ally_four_wheelers_import.csv (if any month files exist)
 *   capitalone_statement_exports/aggregated_capital_one_import.csv
 */

const fs = require('fs');
const path = require('path');

const ALLY_HEADER = ['Date', 'Description', 'Amount'];
const CO_HEADER = ['Transaction Date', 'Description', 'Line Price'];

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

function csvEscape(cell) {
  const s = String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function headersMatch(a, b) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}

function listSorted(dir, re) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => re.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

function aggregateCsvStream(dir, fileRe, outName, expectedHeader) {
  const files = listSorted(dir, fileRe);
  const outPath = path.join(dir, outName);
  if (files.length === 0) {
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch (_) {}
    console.log(`Skip ${outName}: no matching monthly files in ${dir}`);
    return;
  }

  const allData = [];
  for (const fp of files) {
    const rows = parseCsv(fs.readFileSync(fp, 'utf8'));
    if (rows.length < 2) continue;
    const h = rows[0];
    if (!headersMatch(h, expectedHeader)) {
      throw new Error(`Bad header in ${fp}:\n${h.join(',')}\nexpected:\n${expectedHeader.join(',')}`);
    }
    for (let i = 1; i < rows.length; i++) allData.push(rows[i]);
  }

  if (allData.length === 0) {
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch (_) {}
    console.log(`Skip ${outName}: no data rows after merge`);
    return;
  }

  allData.sort((a, b) => {
    const da = (a[0] || '').localeCompare(b[0] || '');
    if (da !== 0) return da;
    return (a[1] || '').localeCompare(b[1] || '');
  });

  const lines = [expectedHeader.join(',')];
  for (const r of allData) {
    const c0 = r[0] ?? '';
    const c1 = r[1] ?? '';
    const c2 = r[2] ?? '';
    lines.push([csvEscape(c0), csvEscape(c1), csvEscape(c2)].join(','));
  }
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${allData.length} data rows → ${outPath} (${files.length} monthly files)`);
}

function main() {
  const root = path.resolve(__dirname, '..');
  const allyDir = path.join(root, 'imports/ignore/older/allybank_statement_exports');
  const coDir = path.join(root, 'imports/ignore/older/capitalone_statement_exports');

  aggregateCsvStream(
    allyDir,
    /^\d{4}-\d{2}_ally_char_bills_tithing_import\.csv$/,
    'aggregated_ally_char_bills_tithing_import.csv',
    ALLY_HEADER
  );
  aggregateCsvStream(
    allyDir,
    /^\d{4}-\d{2}_ally_four_wheelers_import\.csv$/,
    'aggregated_ally_four_wheelers_import.csv',
    ALLY_HEADER
  );
  aggregateCsvStream(
    coDir,
    /^\d{4}-\d{2}_capital_one_import\.csv$/,
    'aggregated_capital_one_import.csv',
    CO_HEADER
  );
}

main();
