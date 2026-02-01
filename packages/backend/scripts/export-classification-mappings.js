#!/usr/bin/env node
/**
 * From the AI Classification CSV (values only), export three two-column mapping files:
 * normalized_value, category (one per parse format: Ally Bank, Capital One, Costco).
 * Column positions from the sheet: Ally col 1=LC, 4=FINAL; Capital One 9=LC, 12=FINAL; Costco 18=LC, 21=FINAL.
 *
 * Usage:
 *   node scripts/export-classification-mappings.js [path-to-AI-Classification.csv]
 *   node scripts/export-classification-mappings.js "imports/ignore/2025-07 Finance Analysis-AI Classification.csv"
 *
 * Writes: {outDir}/ally_bank-mappings.csv, capital_one-mappings.csv, costco_receipts-mappings.csv
 */

const path = require('path');
const fs = require('fs');

const HOME = process.env.HOME || process.env.USERPROFILE || '';

function getIgnoreDir() {
  const root = path.join(HOME, '.myknees', 'backend');
  return path.join(root, 'imports', 'ignore');
}

function findCsvPath(argPath) {
  if (argPath) {
    const resolved = path.isAbsolute(argPath) ? argPath : path.resolve(process.cwd(), argPath);
    if (!fs.existsSync(resolved)) throw new Error('File not found: ' + resolved);
    return resolved;
  }
  const ignoreDir = getIgnoreDir();
  if (!fs.existsSync(ignoreDir)) throw new Error('Ignore dir not found: ' + ignoreDir);
  const files = fs
    .readdirSync(ignoreDir)
    .filter((f) => f.includes('AI Classification') && f.endsWith('.csv'));
  if (files.length === 0) throw new Error('No AI Classification CSV in ' + ignoreDir);
  return path.join(ignoreDir, files[0]);
}

/** Parse CSV into rows of cells (handles quoted fields and quoted newlines) */
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

// Ally: col 1 = LC(), col 4 = FINAL Categorizaiton
// Capital One: col 8 = LC(), col 11 = FINAL (header row has 23 cols; Capital One block starts at 8)
// Costco: col 18 = LC(), col 21 = FINAL Categorizaiton
const BLOCKS = [
  { format: 'ally_bank', lcCol: 1, categoryCol: 4 },
  { format: 'capital_one', lcCol: 8, categoryCol: 11 },
  { format: 'costco_receipts', lcCol: 18, categoryCol: 21 },
];

// Header row in the CSV is the one that starts with "Description,LC()" - typically after many multi-line header cells
const DATA_HEADER = 'Description';

function main() {
  const csvPath = findCsvPath(process.argv[2]);
  const outDir = path.dirname(csvPath);
  const content = fs.readFileSync(csvPath, 'utf8');
  const allRows = parseCsv(content);

  let dataStart = 0;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    if (row[0] === DATA_HEADER && row[1] && row[1].includes('LC')) {
      dataStart = i + 1;
      break;
    }
  }
  if (dataStart === 0) {
    throw new Error('Could not find data header (Description, LC(), ...) in CSV');
  }

  const seen = { ally_bank: new Set(), capital_one: new Set(), costco_receipts: new Set() };
  const rows = { ally_bank: [], capital_one: [], costco_receipts: [] };

  for (let i = dataStart; i < allRows.length; i++) {
    const cells = allRows[i];
    for (const block of BLOCKS) {
      const lc = (cells[block.lcCol] || '').trim();
      const cat = (cells[block.categoryCol] || '').trim();
      if (!lc || !cat) continue;
      const key = `${lc}\t${cat}`;
      if (seen[block.format].has(key)) continue;
      seen[block.format].add(key);
      rows[block.format].push([lc, cat]);
    }
  }

  for (const block of BLOCKS) {
    const outPath = path.join(outDir, `${block.format}-mappings.csv`);
    const header = 'normalized_value,category\n';
    const body = rows[block.format].map(([a, b]) => `"${a.replace(/"/g, '""')}","${b.replace(/"/g, '""')}"`).join('\n');
    fs.writeFileSync(outPath, header + body, 'utf8');
    console.log('Wrote:', outPath, `(${rows[block.format].length} rows)`);
  }
  console.log('Done.');
}

main();
