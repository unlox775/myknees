const { resolveTransactionCategory } = require('./resolve-transaction-category');

/**
 * Resolve a transaction category with per-transaction manual override priority.
 *
 * If category_source=manual_override and category is present on the transaction row,
 * that value wins. Otherwise the result is computed from rule-based classification.
 *
 * @param {{ category?: string|null, category_source?: string|null }} tx
 * @param {string} formatId
 * @param {string} desc
 * @param {string} norm
 * @param {Map<string, string>} ovrMap
 * @param {Map<string, Map<string, string>>} catMap
 * @param {Map<string, {category: string, one_time_event_id?: number|null}>} [ruleOverrideMap]
 * @returns {{ source: 'manual_override'|'rule_based', category: string, rule_source: string|null }}
 */
function resolveEffectiveCategory(tx, formatId, desc, norm, ovrMap, catMap, ruleOverrideMap) {
  if (tx && tx.category_source === 'manual_override' && tx.category) {
    return {
      source: 'manual_override',
      category: tx.category,
      rule_source: null,
    };
  }

  const resolved = resolveTransactionCategory(formatId, desc, norm, ovrMap, catMap, ruleOverrideMap);
  return {
    source: 'rule_based',
    category: resolved.category,
    rule_source: resolved.source,
  };
}

module.exports = {
  resolveEffectiveCategory,
};
