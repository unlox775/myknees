#!/usr/bin/env node
/**
 * Check CSV files for cells that look like formulas (=...).
 * Use after export-xlsx-to-csv to verify raw-only export.
 *
 * Usage:
 *   node scripts/check-csv-no-formulas.js [file.csv ...]
 *   node scripts/check-csv-no-formulas.js imports/ignore/*.csv
 */

const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const issues = [];
  lines.forEach((line, i) => {
    const row = line.split(',').map((cell) => {
      const m = cell.match(/^"((?:[^"]|"")*)"$/);
      return m ? m[1].replace(/""/g, '"') : cell;
    });
    row.forEach((cell, j) => {
      const trimmed = String(cell).trim();
      if (trimmed.startsWith('=')) {
        issues.push({ row: i + 1, col: j + 1, preview: trimmed.slice(0, 50) });
      }
    });
  });
  return issues;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/check-csv-no-formulas.js [file.csv ...]');
    process.exit(1);
  }
  let hadIssues = false;
  for (const filePath of args) {
    if (!fs.existsSync(filePath)) {
      console.warn('Not found:', filePath);
      continue;
    }
    const issues = checkFile(filePath);
    if (issues.length > 0) {
      hadIssues = true;
      console.log(filePath, '- formula-like cells:');
      issues.slice(0, 20).forEach(({ row, col, preview }) => {
        console.log('  Row', row, 'Col', col, preview);
      });
      if (issues.length > 20) console.log('  ... and', issues.length - 20, 'more');
    } else {
      console.log(filePath, '- OK (no formula-like cells)');
    }
  }
  process.exit(hadIssues ? 1 : 0);
}

main();
