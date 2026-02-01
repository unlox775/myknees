#!/usr/bin/env node
/**
 * One-time import: read AI classification sheet from the finance XLSX and populate
 * classification_raw_values, classification_normalized (LC cache), classification_category_map,
 * and classification_overrides.
 *
 * Usage:
 *   node scripts/import-classification-from-xlsx.js [path-to.xlsx]
 *   SOURCE=ally_bank SHEET="AI classification" COL_DESCRIPTION=A COL_LC=B COL_CATEGORY=E COL_OVERRIDE=D node scripts/import-classification-from-xlsx.js
 *
 * Env (defaults shown):
 *   SOURCE=ally_bank
 *   SHEET=AI classification   (or sheet name)
 *   COL_DESCRIPTION=A         (column with raw description)
 *   COL_LC=B                 (column with LC / normalized value - cached)
 *   COL_CATEGORY=E           (column with final category)
 *   COL_SUBCATEGORY=          (optional)
 *   COL_OVERRIDE=D            (optional; if set, overrides go here)
 *   HEADER_ROW=1              (1-based row index of header; data starts next row)
 *
 * Column letters are converted to 0-based indices (A=0, B=1, ...).
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { getKnex } = require('../src/db/knex');
const { nowEpoch } = require('../src/db/dates');

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

function colLetterToIndex(letter) {
  const s = String(letter).toUpperCase().trim();
  let c = 0;
  for (let i = 0; i < s.length; i++) c = c * 26 + (s.charCodeAt(i) - 64);
  return c - 1;
}

function cellValue(sheet, r, c) {
  const ref = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[ref];
  if (!cell || cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

async function ensureSource(knex, name) {
  const existing = await knex('classification_sources').where({ name }).first();
  if (existing) return existing.id;
  const ts = nowEpoch();
  const [id] = await knex('classification_sources').insert({
    name,
    display_name: name.replace(/_/g, ' '),
    created_at: ts,
    updated_at: ts,
  });
  return id;
}

async function upsertRawValue(knex, sourceId, rawValue) {
  const trimmed = String(rawValue).trim();
  if (!trimmed) return null;
  let row = await knex('classification_raw_values').where({ source_id: sourceId, raw_value: trimmed }).first();
  if (row) return row.id;
  const ts = nowEpoch();
  const [id] = await knex('classification_raw_values').insert({
    source_id: sourceId,
    raw_value: trimmed,
    created_at: ts,
    updated_at: ts,
  });
  return id;
}

async function upsertNormalized(knex, rawValueId, normalizedValue) {
  const trimmed = String(normalizedValue).trim();
  if (!trimmed) return;
  const existing = await knex('classification_normalized').where({ raw_value_id: rawValueId }).first();
  const ts = nowEpoch();
  if (existing) {
    await knex('classification_normalized').where({ id: existing.id }).update({
      normalized_value: trimmed,
      updated_at: ts,
    });
  } else {
    await knex('classification_normalized').insert({
      raw_value_id: rawValueId,
      normalized_value: trimmed,
      created_at: ts,
      updated_at: ts,
    });
  }
}

async function upsertCategoryMap(knex, sourceId, normalizedValue, category, subcategory) {
  const n = String(normalizedValue).trim();
  const cat = String(category).trim();
  if (!n || !cat) return;
  const existing = await knex('classification_category_map')
    .where({ source_id: sourceId, normalized_value: n })
    .first();
  const ts = nowEpoch();
  if (existing) {
    await knex('classification_category_map').where({ id: existing.id }).update({
      category: cat,
      subcategory: subcategory ? String(subcategory).trim() : null,
      updated_at: ts,
    });
  } else {
    await knex('classification_category_map').insert({
      source_id: sourceId,
      normalized_value: n,
      category: cat,
      subcategory: subcategory ? String(subcategory).trim() : null,
      created_at: ts,
      updated_at: ts,
    });
  }
}

async function upsertOverride(knex, rawValueId, category, subcategory) {
  const cat = String(category).trim();
  if (!cat) return;
  const existing = await knex('classification_overrides').where({ raw_value_id: rawValueId }).first();
  const ts = nowEpoch();
  if (existing) {
    await knex('classification_overrides').where({ id: existing.id }).update({
      category: cat,
      subcategory: subcategory ? String(subcategory).trim() : null,
      updated_at: ts,
    });
  } else {
    await knex('classification_overrides').insert({
      raw_value_id: rawValueId,
      category: cat,
      subcategory: subcategory ? String(subcategory).trim() : null,
      created_at: ts,
      updated_at: ts,
    });
  }
}

async function main() {
  const xlsxPath = findXlsxPath(process.argv[2]);
  const sourceName = process.env.SOURCE || 'ally_bank';
  const sheetName = process.env.SHEET || 'AI classification';
  const colDescription = colLetterToIndex(process.env.COL_DESCRIPTION || 'A');
  const colLC = colLetterToIndex(process.env.COL_LC || 'B');
  const colCategory = colLetterToIndex(process.env.COL_CATEGORY || 'E');
  const colSubcategory = process.env.COL_SUBCATEGORY ? colLetterToIndex(process.env.COL_SUBCATEGORY) : null;
  const colOverride = process.env.COL_OVERRIDE ? colLetterToIndex(process.env.COL_OVERRIDE) : null;
  const headerRow = Math.max(0, parseInt(process.env.HEADER_ROW || '1', 10) - 1);

  console.log('Reading:', xlsxPath);
  console.log('Sheet:', sheetName, 'Source:', sourceName);
  console.log('Columns: description=', process.env.COL_DESCRIPTION || 'A', 'lc=', process.env.COL_LC || 'B', 'category=', process.env.COL_CATEGORY || 'E', 'override=', process.env.COL_OVERRIDE || '(none)');

  const buf = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true });
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.error('Sheet not found:', sheetName, 'Available:', wb.SheetNames.join(', '));
    process.exit(1);
  }

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const knex = getKnex();
  const sourceId = await ensureSource(knex, sourceName);

  let imported = 0;
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const description = cellValue(sheet, r, colDescription);
    if (!description) continue;

    const lc = cellValue(sheet, r, colLC);
    const category = cellValue(sheet, r, colCategory);
    const subcategory = colSubcategory != null ? cellValue(sheet, r, colSubcategory) : '';
    const override = colOverride != null ? cellValue(sheet, r, colOverride) : '';

    const rawValueId = await upsertRawValue(knex, sourceId, description);
    if (!rawValueId) continue;

    if (lc) await upsertNormalized(knex, rawValueId, lc);
    const normalizedForMap = lc || description;
    if (category) await upsertCategoryMap(knex, sourceId, normalizedForMap, category, subcategory);
    if (override) await upsertOverride(knex, rawValueId, override, subcategory || null);

    imported++;
  }

  console.log('Imported', imported, 'rows.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
