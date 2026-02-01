const { BaseParser } = require('./BaseParser');

/**
 * Ally Bank parser. All Ally-specific rules from Work Tables sheet:
 * - Normalize Find/REPLACE (column D): #\d+→NNN, ~ Future Amount.+$→"", \d+\.\d+→N.NN
 * - LC() (column C): LOWER(D), strip (^\s+|[^\s\w/]|\s+$), collapse \s+ to single space
 */

class AllyBankParser extends BaseParser {
  /** Pre-scrub from Work Tables column D formula */
  preScrub(description) {
    if (typeof description !== 'string') return '';
    let s = description.trim();
    if (!s) return '';
    s = s.replace(/#\d+/g, 'NNN');
    s = s.replace(/~ Future Amount.+$/i, '');
    s = s.replace(/\d+\.\d+/g, 'N.NN');
    return s.trim();
  }

  /** LC from Work Tables column C: REGEXREPLACE(REGEXREPLACE(LOWER(D), "(^\s+|[^\s\w/]|\s+$)", ""), "\s+", " ") */
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

module.exports = { AllyBankParser };
