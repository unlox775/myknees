#!/usr/bin/env node
/**
 * Export raw transaction data from the finance XLSX to CSV (one command).
 * Uses the known sheet/range map for "2025-07 Finance Analysis" style workbooks:
 * - 2025-07-Ally-bills → A:F (Date, Time, Bucket, Amount, Type, Description)
 * - 2025-07-26_CapitalOne → A:E (Transaction Date, Posted Date, Card No., Description, Category)
 * - COSTCO Receipts → full (Reciept #, Date, N, Item #, Product Code, Raw price)
 *
 * Usage:
 *   node scripts/export-finance-raw.js [path-to.xlsx]
 *   npm run xlsx:export -- --raw [path]
 *
 * Writes CSVs next to the xlsx. Then run check-csv-no-formulas.js to verify.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || '';

function getIgnoreDir() {
  const root = path.join(HOME, '.myknees', 'backend');
  return path.join(root, 'imports', 'ignore');
}

function findXlsxPath(argPath) {
  if (argPath) {
    const resolved = path.isAbsolute(argPath) ? argPath : path.resolve(process.cwd(), argPath);
    if (!fs.existsSync(resolved)) throw new Error('File not found: ' + resolved);
    return resolved;
  }
  const ignoreDir = getIgnoreDir();
  if (!fs.existsSync(ignoreDir)) throw new Error('Ignore dir not found: ' + ignoreDir);
  const files = fs.readdirSync(ignoreDir).filter((f) => f.endsWith('.xlsx'));
  if (files.length === 0) throw new Error('No .xlsx file in ' + ignoreDir);
  return path.join(ignoreDir, files[0]);
}

const RAW_SHEETS = [
  { sheet: '2025-07-Ally-bills', range: 'A:F' },
  { sheet: '2025-07-26_CapitalOne', range: 'A:E' },
  { sheet: 'COSTCO Receipts', range: null }, // full
];

function main() {
  const argPath = process.argv[2];
  const xlsxPath = findXlsxPath(argPath);
  const scriptDir = path.join(__dirname);
  const exportScript = path.join(scriptDir, 'export-xlsx-to-csv.js');

  console.log('Exporting raw transaction sheets from:', xlsxPath);
  for (const { sheet, range } of RAW_SHEETS) {
    const env = { ...process.env, XLSX_EXPORT_SHEETS: sheet };
    if (range) env.XLSX_EXPORT_RANGE = range;
    execSync(`node "${exportScript}" "${xlsxPath}"`, {
      stdio: 'inherit',
      env,
      cwd: path.resolve(scriptDir, '..'),
    });
  }
  console.log('Done. Run check-csv-no-formulas.js on the CSVs to verify no formula cells.');
}

main();
