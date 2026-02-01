#!/usr/bin/env node
/**
 * Dump all cell formulas from an XLSX file.
 * Use to align backend normalization with the spreadsheet (e.g. "Normalize Find/REPLACE", LC).
 *
 * Usage:
 *   node scripts/xlsx-dump-formulas.js [path-to.xlsx]
 *   SHEET="Ally Bills - Dabbin'" node scripts/xlsx-dump-formulas.js [path]
 *
 * If no path given, uses first .xlsx in imports/ignore (under DATA_STORE_ROOT or ~/.myknees/backend).
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

function getIgnoreDir() {
  try {
    const { getMykneesRoot } = require('../src/config');
    const root = getMykneesRoot();
    return path.join(root, 'imports', 'ignore');
  } catch (_) {
    const HOME = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(HOME, '.myknees', 'backend', 'imports', 'ignore');
  }
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

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const sheetFilter = process.env.SHEET || null;
  const xlsxPath = findXlsxPath(args[0]);
  console.error('Reading:', xlsxPath);
  if (sheetFilter) console.error('Sheet filter:', sheetFilter);

  const buf = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true });

  const names = sheetFilter ? wb.SheetNames.filter((n) => n === sheetFilter) : wb.SheetNames;
  if (sheetFilter && names.length === 0) {
    console.error('Sheet not found:', sheetFilter);
    console.error('Available:', wb.SheetNames.join(', '));
    process.exit(1);
  }

  for (const name of names) {
    const sheet = wb.Sheets[name];
    const formulae = XLSX.utils.sheet_to_formulae(sheet);
    if (formulae.length === 0) {
      console.log('---', name, '--- (no formulas)');
      continue;
    }
    console.log('---', name, '---');
    for (const line of formulae) {
      console.log(line);
    }
  }
}

main();
