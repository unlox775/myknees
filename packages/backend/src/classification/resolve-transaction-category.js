/**
 * Resolve domain category for a transaction description using the same rules as
 * bucket-report: overrides, per-format mappings, Capital One tail matching,
 * chase_visa → capital_one mapping fallback, then small heuristics.
 */

/**
 * Capital One sheet LC values are often "category / merchant 000 " while card CSV lines
 * normalize to "merchant" or "merchant 000" without the leading category segment.
 */
function capitalOneTailForCompare(mappingKey) {
  const s = String(mappingKey || '');
  const parts = s.split(' / ');
  if (parts.length < 2) {
    return s.replace(/\s+000$/i, '').trim();
  }
  let t = parts.slice(1).join(' / ').trim();
  t = t.replace(/\s+000$/i, '').trim();
  return t;
}

function stripCoStoreSuffix(norm) {
  return String(norm || '')
    .trim()
    .replace(/\s+000$/i, '')
    .trim();
}

/**
 * @param {Map<string, string>} map
 * @param {string} norm
 * @returns {string|null}
 */
function lookupCapitalOneStyle(map, norm) {
  const nRaw = String(norm || '').trim();
  if (!nRaw) return null;
  if (map.has(nRaw)) return map.get(nRaw);
  const n = stripCoStoreSuffix(nRaw);
  for (const [k, v] of map) {
    const tail = capitalOneTailForCompare(k);
    if (tail === nRaw || tail === n || stripCoStoreSuffix(tail) === n) return v;
  }
  return null;
}

/**
 * @param {string} norm
 * @param {string} raw
 * @returns {string|null}
 */
function inferCategory(norm, raw) {
  const n = String(norm || '').toLowerCase();
  const r = String(raw || '').toLowerCase();
  const blob = `${n} ${r}`;
  if (/\binterest paid\b|\bpayroll\b|\bdirect dep\b|\bdeposit from\b|\bdividend\b/.test(blob)) return 'Income';
  if (
    /\binternet transfer\b|\bzelle payment\b|\bwire return\b|\boutgoing wire\b|\binternal transfer\b/.test(n) ||
    /\binternet transfer\b|\bzelle payment\b/.test(r)
  ) {
    return 'Transfer';
  }
  if (/\bcrcardpmt\b|\bcapital one card payment\b|\bcard payment received\b|\bautopay\b.*\bthank\b/.test(blob)) {
    return 'Transfer';
  }
  return null;
}

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<Map<string, Map<string, string>>>}
 */
async function loadCategoryMaps(knex) {
  const rows = await knex('classification_mappings')
    .join('classification_categories', 'classification_categories.id', 'classification_mappings.category_id')
    .join('parse_formats', 'parse_formats.id', 'classification_mappings.parse_format_id')
    .select(
      'parse_formats.identifier as format_id',
      'classification_mappings.normalized_value',
      'classification_categories.name as category'
    );

  /** @type {Map<string, Map<string, string>>} */
  const byFormat = new Map();
  for (const r of rows) {
    const fid = r.format_id;
    if (!byFormat.has(fid)) byFormat.set(fid, new Map());
    byFormat.get(fid).set(String(r.normalized_value || '').trim(), r.category);
  }
  return byFormat;
}

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<Map<string, string>>}
 */
async function loadOverrides(knex) {
  const rows = await knex('classification_overrides')
    .join('classification_raw_values', 'classification_raw_values.id', 'classification_overrides.raw_value_id')
    .join('classification_categories', 'classification_categories.id', 'classification_overrides.category_id')
    .join('parse_formats', 'parse_formats.id', 'classification_raw_values.parse_format_id')
    .select('parse_formats.identifier as format_id', 'classification_raw_values.raw_value', 'classification_categories.name as category');

  /** @type {Map<string, string>} */
  const keyToCat = new Map();
  for (const r of rows) {
    keyToCat.set(`${r.format_id}\t${String(r.raw_value || '')}`, r.category);
  }
  return keyToCat;
}

/**
 * @param {string} formatId
 * @param {string} desc
 * @param {string} norm
 * @param {Map<string, string>} ovrMap
 * @param {Map<string, Map<string, string>>} catMap
 * @returns {{ source: 'override'|'mapping'|'capital_one_fallback'|'inferred'|'unmapped', category: string }}
 */
function resolveTransactionCategory(formatId, desc, norm, ovrMap, catMap) {
  const ovr = ovrMap.get(`${formatId}\t${desc}`);
  if (ovr) {
    return { source: 'override', category: ovr };
  }

  let category = null;
  let source = /** @type {'mapping'|'capital_one_fallback'|null} */ (null);
  const m = catMap.get(formatId);
  if (m) {
    if (formatId === 'capital_one' || formatId === 'chase_visa') {
      category = lookupCapitalOneStyle(m, norm);
    } else {
      category = m.get(norm) || null;
    }
    if (category) source = 'mapping';
  }
  if (!category && formatId === 'chase_visa') {
    const mco = catMap.get('capital_one');
    if (mco) {
      category = lookupCapitalOneStyle(mco, norm);
      if (category) source = 'capital_one_fallback';
    }
  }
  if (category && source) {
    return { source, category };
  }

  const inferred = inferCategory(norm, desc);
  if (inferred) {
    return { source: 'inferred', category: inferred };
  }

  return { source: 'unmapped', category: 'Undefined' };
}

module.exports = {
  resolveTransactionCategory,
  loadCategoryMaps,
  loadOverrides,
  inferCategory,
  lookupCapitalOneStyle,
  capitalOneTailForCompare,
  stripCoStoreSuffix,
};
