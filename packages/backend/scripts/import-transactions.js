#!/usr/bin/env node
/**
 * Import transaction CSV for a parse format: extract distinct descriptions,
 * insert into classification_raw_values, run parser and cache in classification_normalized.
 *
 * Usage:
 *   node scripts/import-transactions.js --format=ally_bank path/to/ally-bills.csv
 *   node scripts/import-transactions.js --format=capital_one path/to/capital-one.csv
 *   node scripts/import-transactions.js --format=costco_receipts path/to/costco-receipts.csv
 *
 * Format determines: which parser runs (LC normalizer) and which CSV column is "description".
 * ally_bank: column "Description" (Ally bills CSV)
 * capital_one: column "Description" (Capital One CSV)
 * costco_receipts: column "Product Code" (Costco CSV)
 */

const path = require('path');
const fs = require('fs');
const { getKnex } = require('../src/db/knex');
const { getParser } = require('../src/classification');
const { nowEpoch } = require('../src/db/dates');

const FORMAT_DESC_COLUMN = {
  ally_bank: 'Description',
  capital_one: 'Description',
  costco_receipts: 'Product Code',
};

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

async function main() {
  const args = process.argv.slice(2);
  const formatArg = args.find((a) => a.startsWith('--format='));
  const csvPath = args.find((a) => !a.startsWith('--') && (a.endsWith('.csv') || a.includes('.csv')));
  if (!formatArg || !csvPath) {
    console.error('Usage: node scripts/import-transactions.js --format=ally_bank path/to/file.csv');
    process.exit(1);
  }
  const formatId = formatArg.split('=')[1].trim();
  const descColName = FORMAT_DESC_COLUMN[formatId];
  if (!descColName) {
    console.error('Unknown format. Use: ally_bank, capital_one, costco_receipts');
    process.exit(1);
  }
  const parser = getParser(formatId);
  if (!parser) {
    console.error('No parser for format:', formatId);
    process.exit(1);
  }

  const resolvedPath = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error('File not found:', resolvedPath);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length < 2) {
    console.error('CSV has no data rows');
    process.exit(1);
  }
  const header = rows[0];
  const descColIndex = header.findIndex((h) => h === descColName);
  if (descColIndex < 0) {
    console.error('Column not found:', descColName, 'Header:', header.join(', '));
    process.exit(1);
  }

  const distinctDescriptions = new Set();
  for (let i = 1; i < rows.length; i++) {
    const val = (rows[i][descColIndex] || '').trim();
    if (val) distinctDescriptions.add(val);
  }

  const knex = getKnex();
  const formatRow = await knex('parse_formats').where({ identifier: formatId }).first();
  if (!formatRow) {
    console.error('Parse format not found:', formatId, '(run migrations)');
    process.exit(1);
  }
  const parseFormatId = formatRow.id;
  const ts = nowEpoch();

  let insertedRaw = 0;
  let insertedNorm = 0;
  for (const rawValue of distinctDescriptions) {
    let rawRow = await knex('classification_raw_values')
      .where({ parse_format_id: parseFormatId, raw_value: rawValue })
      .first();
    if (!rawRow) {
      await knex('classification_raw_values').insert({
        parse_format_id: parseFormatId,
        raw_value: rawValue,
        created_at: ts,
        updated_at: ts,
      });
      rawRow = await knex('classification_raw_values')
        .where({ parse_format_id: parseFormatId, raw_value: rawValue })
        .first();
      insertedRaw++;
    }
    const normalizedValue = parser.normalize(rawValue);
    if (!normalizedValue) continue;
    const existingNorm = await knex('classification_normalized').where({ raw_value_id: rawRow.id }).first();
    if (!existingNorm) {
      await knex('classification_normalized').insert({
        raw_value_id: rawRow.id,
        normalized_value: normalizedValue,
        created_at: ts,
        updated_at: ts,
      });
      insertedNorm++;
    } else {
      await knex('classification_normalized').where({ id: existingNorm.id }).update({
        normalized_value: normalizedValue,
        updated_at: ts,
      });
    }
  }

  console.log('Format:', formatId);
  console.log('Distinct descriptions:', distinctDescriptions.size);
  console.log('New raw values inserted:', insertedRaw);
  console.log('Normalized cache updated:', insertedNorm);
  await knex.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
