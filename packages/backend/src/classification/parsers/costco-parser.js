const { BaseParser } = require('./BaseParser');

/**
 * Costco Receipts parser. All Costco-specific rules from Work Tables sheet:
 * - Normalize Find/REPLACE (column U): strip ^[\*\/\s]+|[\*\s]+$, then ^KS  → Costco 
 * - LC() (column T): LOWER(U), strip (^\s+|[^\s\w/]|\s+$), collapse \s+ to single space
 */

class CostcoParser extends BaseParser {
  /** Pre-scrub from Work Tables column U formula */
  preScrub(description) {
    if (typeof description !== 'string') return '';
    let s = description.trim();
    if (!s) return '';
    s = s.replace(/^[\*\/\s]+|[\*\s]+$/g, '');
    s = s.replace(/^KS /i, 'Costco ');
    return s.trim();
  }

  /** LC from Work Tables column T */
  lc(description) {
    if (typeof description !== 'string') return '';
    let s = description.toLowerCase().trim();
    s = s.replace(/^\s+|[^\s\w/]|\s+$/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  normalize(description) {
    return this.lc(this.preScrub(description));
  }
}

module.exports = { CostcoParser };
