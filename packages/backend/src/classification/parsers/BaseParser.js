/**
 * Base parser: all format-specific parsers extend this and implement normalize(description).
 * Each format has its own pre-scrub and LC (lowercase/clean) logic from the Work Tables sheet;
 * there is no shared LC—each parser implements its full algorithm.
 */

class BaseParser {
  /**
   * Override in subclasses. Raw description → normalized string for lookup.
   * @param {string} description
   * @returns {string}
   */
  normalize(description) {
    throw new Error('normalize() must be implemented by subclass');
  }
}

module.exports = { BaseParser };
