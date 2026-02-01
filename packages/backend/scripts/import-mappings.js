#!/usr/bin/env node
/**
 * Import one mapping CSV: normalized_value, category → classification_mappings.
 * Category name is looked up in classification_categories (seed from migration).
 *
 * Usage:
 *   node scripts/import-mappings.js <format> <path>
 *   node scripts/import-mappings.js ally_bank imports/ignore/ally_bank-mappings.csv
 *   node scripts/import-mappings.js capital_one imports/ignore/capital_one-mappings.csv
 *   node scripts/import-mappings.js costco_receipts imports/ignore/costco_receipts-mappings.csv
 *
 * First argument: format (ally_bank | capital_one | costco_receipts). Second: CSV path.
 * CSV must have header: normalized_value,category.
 */

const path = require('path');
const fs = require('fs');
const { getKnex } = require('../src/db/knex');
const { nowEpoch } = require('../src/db/dates');

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

async function importOneCsv(knex, formatId, csvPath, ts) {
  const resolvedPath = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('File not found: ' + resolvedPath);
  }
  const formatRow = await knex('parse_formats').where({ identifier: formatId }).first();
  if (!formatRow) {
    throw new Error('Parse format not found: ' + formatId);
  }
  const parseFormatId = formatRow.id;

  const content = fs.readFileSync(resolvedPath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length < 2) {
    console.log('  No data rows in', csvPath);
    return 0;
  }
  const header = rows[0].map((h) => h.toLowerCase());
  const normCol = header.findIndex((h) => h === 'normalized_value' || h === 'normalized value');
  const catCol = header.findIndex((h) => h === 'category');
  if (normCol < 0 || catCol < 0) {
    throw new Error('CSV must have columns normalized_value and category. Header: ' + rows[0].join(', '));
  }

  const categories = await knex('classification_categories').select('id', 'name');
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

  let inserted = 0;
  let updated = 0;
  for (let i = 1; i < rows.length; i++) {
    const normalizedValue = (rows[i][normCol] || '').trim();
    const categoryName = (rows[i][catCol] || '').trim();
    if (!normalizedValue || !categoryName) continue;
    const categoryId = categoryByName.get(categoryName);
    if (!categoryId) {
      console.warn('  Unknown category "' + categoryName + '" in row ' + (i + 1) + '; skip');
      continue;
    }
    const existing = await knex('classification_mappings')
      .where({ parse_format_id: parseFormatId, normalized_value: normalizedValue })
      .first();
    if (existing) {
      await knex('classification_mappings').where({ id: existing.id }).update({
        category_id: categoryId,
        updated_at: ts,
      });
      updated++;
    } else {
      await knex('classification_mappings').insert({
        parse_format_id: parseFormatId,
        normalized_value: normalizedValue,
        category_id: categoryId,
        created_at: ts,
        updated_at: ts,
      });
      inserted++;
    }
  }
  console.log('  ', csvPath, '- inserted:', inserted, 'updated:', updated);
  return inserted + updated;
}

async function main() {
  const args = process.argv.slice(2);
  const formatId = args[0]?.trim();
  const csvPath = args[1]?.trim();
  if (!formatId || !csvPath) {
    console.error('Usage: node scripts/import-mappings.js <format> <path>');
    console.error('Example: node scripts/import-mappings.js ally_bank imports/ignore/ally_bank-mappings.csv');
    process.exit(1);
  }

  const knex = getKnex();
  const ts = nowEpoch();
  await importOneCsv(knex, formatId, csvPath, ts);
  console.log('Done.');
  await knex.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
