#!/usr/bin/env node
/**
 * Recompute all classification_normalized values from current parser algorithms.
 * Use after changing parser logic (e.g. aligning with Work Tables) so existing
 * raw values get new normalized_value; fewer distinct normalized values and more
 * will match existing mappings.
 *
 * Usage:
 *   node scripts/recompute-normalized.js
 *   npm run recompute-normalized
 */

const { getKnex } = require('../src/db/knex');
const { getParser } = require('../src/classification');

function nowEpoch() {
  return Date.now() / 1000;
}

async function main() {
  const knex = getKnex();
  const ts = nowEpoch();

  const rawRows = await knex('classification_raw_values')
    .select('classification_raw_values.id as raw_value_id', 'classification_raw_values.raw_value', 'parse_formats.identifier as format_id')
    .join('parse_formats', 'classification_raw_values.parse_format_id', 'parse_formats.id');

  let updated = 0;
  let inserted = 0;

  for (const row of rawRows) {
    const parser = getParser(row.format_id);
    if (!parser) continue;
    const normalizedValue = parser.normalize(row.raw_value);
    if (!normalizedValue) continue;

    const existing = await knex('classification_normalized').where({ raw_value_id: row.raw_value_id }).first();
    if (existing) {
      await knex('classification_normalized').where({ id: existing.id }).update({
        normalized_value: normalizedValue,
        updated_at: ts,
      });
      updated++;
    } else {
      await knex('classification_normalized').insert({
        raw_value_id: row.raw_value_id,
        normalized_value: normalizedValue,
        created_at: ts,
        updated_at: ts,
      });
      inserted++;
    }
  }

  console.log('Recomputed normalized values: updated', updated, 'inserted', inserted, 'total raw values', rawRows.length);
  await knex.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
