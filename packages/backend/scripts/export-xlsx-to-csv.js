#!/usr/bin/env node
/**
 * Export XLSX sheets to CSV using only cell values (no formula strings).
 * Optionally limit to a column range (e.g. A–F) so output has no formula columns.
 *
 * Usage:
 *   node scripts/export-xlsx-to-csv.js [path-to.xlsx] [options]
 *   npm run xlsx:export -- [path]
 *
 * Options (env or args):
 *   XLSX_EXPORT_RANGE  e.g. "A:F" to export only columns A–F (raw-only). Omit to export full used range (values only).
 *   XLSX_EXPORT_SHEETS comma-separated sheet names; omit to export all sheets.
 *
 * Output: same directory as xlsx, files named {base}-{sheet}.csv
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const HOME = process.env.HOME || process.env.USERPROFILE || '';

function getIgnoreDir() {
  const root = path.join(HOME, '.myknees', 'backend');
  return path.join(root, 'imports', 'ignore');
}

function findXlsxPath(argPath) {
  if (argPath) {
    if (!fs.existsSync(argPath)) throw new Error('File not found: ' + argPath);
    return path.resolve(argPath);
  }
  const ignoreDir = getIgnoreDir();
  if (!fs.existsSync(ignoreDir)) throw new Error('Ignore dir not found: ' + ignoreDir);
  const files = fs.readdirSync(ignoreDir).filter((f) => f.endsWith('.xlsx'));
  if (files.length === 0) throw new Error('No .xlsx file in ' + ignoreDir);
  return path.join(ignoreDir, files[0]);
}

/** Parse "A:F" or "A1:F100" into { s: {c,r}, e: {c,r} } 0-based. */
function parseColumnRange(rangeStr, maxRow) {
  const m = rangeStr.match(/^([A-Z]+)(?::([A-Z]+))?$/i);
  if (!m) return null;
  const colToIndex = (col) => {
    let c = 0;
    for (let i = 0; i < col.length; i++) c = c * 26 + (col.charCodeAt(i) - 64);
    return c - 1;
  };
  const sc = colToIndex(m[1]);
  const ec = m[2] ? colToIndex(m[2]) : sc;
  return {
    s: { r: 0, c: sc },
    e: { r: maxRow != null ? maxRow - 1 : 999999, c: ec },
  };
}

/** Get cell value only (no formula); for CSV we always export .v */
function cellValue(cell) {
  if (!cell) return '';
  if (cell.v === undefined || cell.v === null) return '';
  if (typeof cell.v === 'object' && cell.v instanceof Date) return cell.v.toISOString();
  return String(cell.v);
}

/** Export sheet to array of rows (values only), optionally limited to column range */
function sheetToRows(sheet, rangeLimit) {
  const fullRange = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const range = rangeLimit
    ? {
        s: { r: Math.max(0, rangeLimit.s.r), c: Math.max(0, rangeLimit.s.c) },
        e: {
          r: Math.min(fullRange.e.r, rangeLimit.e.r),
          c: Math.min(fullRange.e.c, rangeLimit.e.c),
        },
      }
    : fullRange;

  const rows = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[ref];
      row.push(cellValue(cell));
    }
    rows.push(row);
  }
  return rows;
}

/** Escape CSV field (quotes if contains comma, quote, or newline) */
function escapeCsvField(s) {
  const str = String(s ?? '');
  if (/[",\r\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const pathArg = args.find((a) => !a.startsWith('-') && (a.endsWith('.xlsx') || !a.includes('=')));
  const xlsxPath = findXlsxPath(pathArg);
  const rangeStr = process.env.XLSX_EXPORT_RANGE || (args.find((a) => a.startsWith('range=')) || '').replace('range=', '');
  const sheetsFilter = process.env.XLSX_EXPORT_SHEETS
    ? process.env.XLSX_EXPORT_SHEETS.split(',').map((s) => s.trim())
    : null;

  console.log('Reading:', xlsxPath);
  if (rangeStr) console.log('Column range (raw only):', rangeStr);

  const buf = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true });

  const outDir = path.dirname(xlsxPath);
  const base = path.basename(xlsxPath, '.xlsx');

  const sheetNames = sheetsFilter && sheetsFilter.length ? sheetsFilter : wb.SheetNames;
  for (const name of sheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) {
      console.warn('Sheet not found:', name);
      continue;
    }
    const fullRange = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rangeLimit = rangeStr
      ? parseColumnRange(rangeStr, fullRange.e.r + 1)
      : null;

    const rows = sheetToRows(sheet, rangeLimit);
    const csv = rowsToCsv(rows);
    const safeName = name.replace(/[/\\?*:[\]]/g, '_');
    const csvPath = path.join(outDir, `${base}-${safeName}.csv`);
    fs.writeFileSync(csvPath, csv, 'utf8');
    console.log('Wrote:', csvPath, `(${rows.length} rows)`);
  }

  console.log('Done.');
}

main();
