#!/usr/bin/env node
/**
 * Extract pre-scrub and LC formulas from the "Work Tables" sheet of the finance XLSX.
 * Use to align backend parsers (ally-bank, capital-one, costco) with the spreadsheet.
 *
 * Usage:
 *   node scripts/xlsx-extract-work-table-formulas.js [path-to.xlsx]
 *   npm run xlsx:extract-work-formulas
 *
 * If no path given, uses first .xlsx in imports/ignore.
 * Output: formula lines for Work Tables (Ally cols A–D, Capital One I–M, Costco R–U).
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

function getIgnoreDir() {
  try {
    const { getMykneesRoot } = require('../src/config');
    return path.join(getMykneesRoot(), 'imports', 'ignore');
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
  const xlsxPath = findXlsxPath(args[0]);
  console.error('Reading:', xlsxPath);

  const buf = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true });

  const sheetName = wb.SheetNames.find((n) => /work\s*table/i.test(n));
  if (!sheetName) {
    console.error('No "Work Tables" sheet found. Sheets:', wb.SheetNames.join(', '));
    process.exit(1);
  }

  const sheet = wb.Sheets[sheetName];
  const formulae = XLSX.utils.sheet_to_formulae(sheet);

  console.log('# Work Tables formulas (Ally A–D, Capital One I–M, Costco R–U)');
  console.log('# Ally: A=raw, B=date, C=LC(), D=Normalize Find/REPLACE');
  console.log('# Capital One: I=raw, J=category, K=date, L=LC(), M=Normalize Find/REPLACE');
  console.log('# Costco: R=raw, S=date, T=LC(), U=Normalize Find/REPLACE');
  console.log('---');
  for (const line of formulae) {
    console.log(line);
  }
}

main();
