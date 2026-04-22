const { getParser } = require('./index');

async function upsertClassificationForRaw(knex, formatIdentifier, rawValue, ts) {
  const parser = getParser(formatIdentifier);
  if (!parser) throw new Error(`No parser for format: ${formatIdentifier}`);
  const formatRow = await knex('parse_formats').where({ identifier: formatIdentifier }).first();
  if (!formatRow) throw new Error(`Unknown parse_formats row: ${formatIdentifier}`);
  const parseFormatId = formatRow.id;

  let rawRow = await knex('classification_raw_values')
    .where({ parse_format_id: parseFormatId, raw_value: rawValue })
    .first();
  let insertedRaw = false;
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
    insertedRaw = true;
  }
  const normalizedValue = parser.normalize(rawValue);
  if (!normalizedValue) return { insertedRaw, insertedNorm: false, updatedNorm: false };
  const existingNorm = await knex('classification_normalized').where({ raw_value_id: rawRow.id }).first();
  if (!existingNorm) {
    await knex('classification_normalized').insert({
      raw_value_id: rawRow.id,
      normalized_value: normalizedValue,
      created_at: ts,
      updated_at: ts,
    });
    return { insertedRaw, insertedNorm: true, updatedNorm: false };
  }
  if (existingNorm.normalized_value !== normalizedValue) {
    await knex('classification_normalized').where({ id: existingNorm.id }).update({
      normalized_value: normalizedValue,
      updated_at: ts,
    });
    return { insertedRaw, insertedNorm: false, updatedNorm: true };
  }
  return { insertedRaw, insertedNorm: false, updatedNorm: false };
}

module.exports = { upsertClassificationForRaw };
