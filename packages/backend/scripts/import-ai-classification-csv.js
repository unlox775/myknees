#!/usr/bin/env node
/**
 * Import the wide "Finance Analysis - AI Classification" CSV export into
 * classification_mappings (per parse format: ally_bank, capital_one, costco_receipts).
 *
 * Uses FINAL categorization column when set; normalized keys from LC() when present,
 * otherwise parser.normalize(Description). When sheet LC differs from the current
 * parser output, both keys are stored so live transactions still resolve.
 *
 * Usage:
 *   node scripts/import-ai-classification-csv.js /path/to/export.csv
 *   make import-ai-classification-csv CSV=/path/to/export.csv
 */

const fs = require('fs');
const path = require('path');
const { getKnex } = require('../src/db/knex');
const { nowEpoch } = require('../src/db/dates');
const { getParser } = require('../src/classification');
const { parseCsv } = require('./lib/csv-parse');

const FORMAT_BY_SECTION_INDEX = ['ally_bank', 'capital_one', 'costco_receipts'];

/**
 * @param {string[]} header
 * @returns {{ desc: number, lc: number, finalCat: number }[]}
 */
function findWideSheetSections(header) {
  const starts = [];
  for (let i = 0; i < header.length; i++) {
    if (String(header[i]).trim() === 'Description') starts.push(i);
  }
  const sections = [];
  for (let s = 0; s < starts.length; s++) {
    const from = starts[s];
    const to = s + 1 < starts.length ? starts[s + 1] : header.length;
    let desc = from;
    let lc = -1;
    let finalCat = -1;
    for (let j = from; j < to; j++) {
      const h = String(header[j] || '').trim();
      if (j === from) desc = j;
      if (/^LC\(\)/i.test(h) || h === 'LC()') lc = j;
      if (/FINAL.*Categor/i.test(h)) finalCat = j;
    }
    sections.push({ desc, lc, finalCat });
  }
  return sections;
}

function findHeaderRowIndex(rows) {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r[0] === 'Description' && r[1] && String(r[1]).trim().startsWith('LC')) return i;
  }
  return -1;
}

async function upsertMapping(knex, parseFormatId, normalizedValue, categoryId, ts) {
  const n = String(normalizedValue || '').trim();
  if (!n) return false;
  const existing = await knex('classification_mappings')
    .where({ parse_format_id: parseFormatId, normalized_value: n })
    .first();
  if (existing) {
    await knex('classification_mappings').where({ id: existing.id }).update({
      category_id: categoryId,
      updated_at: ts,
    });
  } else {
    await knex('classification_mappings').insert({
      parse_format_id: parseFormatId,
      normalized_value: n,
      category_id: categoryId,
      created_at: ts,
      updated_at: ts,
    });
  }
  return true;
}

async function main() {
  const csvPath = process.argv[2]?.trim();
  if (!csvPath) {
    console.error('Usage: node scripts/import-ai-classification-csv.js <path-to-wide-export.csv>');
    process.exit(1);
  }
  const resolved = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved);
    process.exit(1);
  }

  const content = fs.readFileSync(resolved, 'utf8');
  const rows = parseCsv(content);
  const headerIdx = findHeaderRowIndex(rows);
  if (headerIdx < 0) {
    console.error('Could not find header row (Description + LC() in first columns).');
    process.exit(1);
  }
  const header = rows[headerIdx];
  const sections = findWideSheetSections(header);
  if (sections.length < 2) {
    console.error('Expected at least Ally + Capital One sections; found', sections.length);
    process.exit(1);
  }

  const knex = getKnex();
  const ts = nowEpoch();
  const categories = await knex('classification_categories').select('id', 'name');
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));
  const formats = await knex('parse_formats').select('id', 'identifier');
  const formatIdByIdentifier = new Map(formats.map((f) => [f.identifier, f.id]));

  let rowsTouched = 0;
  let skippedUnknownCat = 0;

  for (let ri = headerIdx + 1; ri < rows.length; ri++) {
    const row = rows[ri];
    for (let si = 0; si < sections.length; si++) {
      const fmtIdentifier = FORMAT_BY_SECTION_INDEX[si] || 'costco_receipts';
      const parseFormatId = formatIdByIdentifier.get(fmtIdentifier);
      if (!parseFormatId) continue;

      const { desc, lc, finalCat } = sections[si];
      if (finalCat < 0 || desc < 0) continue;
      const rawDesc = (row[desc] || '').trim();
      const finalName = (row[finalCat] || '').trim();
      if (!finalName || !rawDesc) {
        continue;
      }
      // Google Sheets "values" export can still contain formula text in some cells.
      if (finalName.startsWith('=')) {
        continue;
      }
      const categoryId = categoryByName.get(finalName);
      if (!categoryId) {
        console.warn('Unknown category, skip:', JSON.stringify(finalName));
        skippedUnknownCat++;
        continue;
      }

      const parser = getParser(fmtIdentifier);
      const lcVal = lc >= 0 ? (row[lc] || '').trim() : '';
      const normFromSheet = lcVal || (parser ? parser.normalize(rawDesc) : '');
      const normFromParser = parser ? parser.normalize(rawDesc) : normFromSheet;

      const keys = new Set();
      if (normFromSheet) keys.add(normFromSheet);
      if (normFromParser && normFromParser !== normFromSheet) keys.add(normFromParser);

      for (const k of keys) {
        await upsertMapping(knex, parseFormatId, k, categoryId, ts);
        rowsTouched++;
      }
    }
  }

  console.log('classification_mappings upserts (key writes):', rowsTouched);
  console.log('Skipped (unknown category name):', skippedUnknownCat);
  await knex.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
