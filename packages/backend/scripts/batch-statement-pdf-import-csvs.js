#!/usr/bin/env node
/**
 * Run statement-pdf-to-import-csv.js on every Ally YYYY-MM.pdf and every
 * Capital One Statement_MMYYYY_*.pdf under imports/ignore/older/.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const allyDir = path.join(root, 'imports/ignore/older/allybank_statement_exports');
const coDir = path.join(root, 'imports/ignore/older/capitalone_statement_exports');
const extract = path.join(root, 'scripts/statement-pdf-to-import-csv.js');

function pdfs(dir, pat) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => pat.test(f) && f.endsWith('.pdf'))
    .map((f) => path.join(dir, f))
    .sort();
}

let failed = false;
for (const pdf of pdfs(allyDir, /^\d{4}-\d{2}\.pdf$/)) {
  console.log(`\n--- Ally ${path.basename(pdf)} ---`);
  try {
    execSync(`node "${extract}" ally "${pdf}"`, { stdio: 'inherit', cwd: root });
  } catch (_) {
    failed = true;
  }
}
for (const pdf of pdfs(coDir, /^Statement_\d{6}_/)) {
  console.log(`\n--- Capital One ${path.basename(pdf)} ---`);
  try {
    execSync(`node "${extract}" capital-one "${pdf}"`, { stdio: 'inherit', cwd: root });
  } catch (_) {
    failed = true;
  }
}

if (failed) process.exit(1);
