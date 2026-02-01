#!/usr/bin/env node
/**
 * Explore an XLSX file: list sheets, used range, and which columns contain formulas.
 * Use to decide raw-only ranges for CSV export (e.g. A–F if G+ are formulas).
 *
 * Usage:
 *   node scripts/xlsx-explore.js [path-to.xlsx]
 *   npm run xlsx:explore -- [path]
 *
 * If no path given, uses first .xlsx in ~/.myknees/backend/imports/ignore/ (Mac).
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

/** Convert 0-based column index to letter(s), e.g. 0 -> A, 26 -> AA */
function colToLetter(c) {
  let s = '';
  while (c >= 0) {
    s = String.fromCharCode((c % 26) + 65) + s;
    c = Math.floor(c / 26) - 1;
  }
  return s;
}

function cellVal(cell) {
  if (!cell || cell.v === undefined || cell.v === null) return '';
  if (typeof cell.v === 'object' && cell.v instanceof Date) return cell.v.toISOString();
  return String(cell.v).slice(0, 50);
}

/** Get used range and which columns have any formula in the sheet */
function analyzeSheet(sheet, sheetName) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const formulaCols = new Set();
  const valueOnlyCols = new Set();
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[ref];
      if (!cell) continue;
      if (cell.f) formulaCols.add(c);
      else if (cell.v !== undefined && cell.v !== '') valueOnlyCols.add(c);
    }
  }
  const maxCol = range.e.c;
  const maxRow = range.e.r;
  const colLetters = Array.from({ length: maxCol + 1 }, (_, i) => colToLetter(i));
  const formulaColLetters = [...formulaCols].sort((a, b) => a - b).map(colToLetter);
  // Suggest raw-only range: columns that have no formulas (before first formula col), or all if no formulas
  const firstFormulaCol = formulaCols.size ? Math.min(...formulaCols) : null;
  let suggestedRawRange;
  if (firstFormulaCol == null) {
    suggestedRawRange = `A1:${colToLetter(maxCol)}${maxRow + 1}`;
  } else if (firstFormulaCol === 0) {
    suggestedRawRange = '(all columns have formulas; export will use cell values only)';
  } else {
    suggestedRawRange = `A1:${colToLetter(firstFormulaCol - 1)}${maxRow + 1}`;
  }

  return {
    sheetName,
    range: sheet['!ref'] || 'A1',
    maxRow: maxRow + 1,
    maxCol: maxCol + 1,
    formulaCols: [...formulaCols].sort((a, b) => a - b),
    formulaColLetters,
    suggestedRawRange,
    hasFormulas: formulaCols.size > 0,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const args = argv.filter((a) => !a.startsWith('--'));
  let previewRows = 0;
  const idx = argv.findIndex((a) => a === '--preview' || a.startsWith('--preview='));
  if (idx >= 0) {
    const v = argv[idx].startsWith('--preview=') ? argv[idx].split('=')[1] : argv[idx + 1];
    previewRows = Math.max(1, parseInt(v || '5', 10));
  }
  const argPath = args[0];
  const xlsxPath = findXlsxPath(argPath);
  console.log('Reading:', xlsxPath);

  const buf = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true });

  console.log('\nSheets:', wb.SheetNames.join(', '));

  const results = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const info = analyzeSheet(sheet, name);
    results.push(info);
    console.log('\n---', name, '---');
    console.log('  Used range:', info.range, '  Rows:', info.maxRow, 'Cols:', info.maxCol);
    if (info.hasFormulas) {
      console.log('  Columns with formulas (by letter):', info.formulaColLetters.join(', '));
      console.log('  Suggested raw-only range (no formulas):', info.suggestedRawRange);
    } else {
      console.log('  No formulas detected; full range is raw.');
    }
    if (previewRows > 0) {
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      const n = Math.min(previewRows, range.e.r - range.s.r + 1);
      console.log('  Preview (first', n, 'rows, values only):');
      for (let r = range.s.r; r < range.s.r + n; r++) {
        const row = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          row.push(cellVal(sheet[XLSX.utils.encode_cell({ r, c })]));
        }
        console.log('    ', row.join(' | '));
      }
    }
  }

  // Write JSON summary for programmatic use
  const outDir = path.dirname(xlsxPath);
  const base = path.basename(xlsxPath, '.xlsx');
  const summaryPath = path.join(outDir, base + '-explore-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ path: xlsxPath, sheets: results }, null, 2));
  console.log('\nSummary written to:', summaryPath);
}

main();
