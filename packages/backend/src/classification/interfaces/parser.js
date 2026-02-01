/**
 * Base parser interface: given a raw description string, return a normalized
 * (lowercased/cleaned) string for lookup. Each parse format (Ally Bank, Capital One,
 * Costco Receipts) can have its own implementation.
 */

/**
 * @param {string} description - Raw transaction/line description
 * @returns {string} Normalized description (e.g. lowercase, regex-cleaned)
 */
function normalize(description) {
  throw new Error('normalize() must be implemented');
}

module.exports = { normalize };
