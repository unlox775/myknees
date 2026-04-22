const { BaseParser } = require('./BaseParser');

/**
 * Capital One parser. All Capital One–specific rules from Work Tables sheet (DCapN / DCap):
 * - Normalize Find/REPLACE (column M): Amazon pattern→"AMAZON Purchase", store/ref digit runs→" 000 ", #\d+→"000", \d+\.\d+→N.NN
 *   (Digit-run rule tightened vs sheet literal: require code not to start mid-word, so MEGAPLEX-03 keeps the X.)
 *   (Sheet also prefixes category J&" / "; we only normalize description here.)
 * - LC() (column L): LOWER(M), strip (^\s+|[^\s\w/]|\s+$), collapse \s+ to single space
 */

class CapitalOneParser extends BaseParser {
  /** Pre-scrub from Work Tables column M formula (description-only part) */
  preScrub(description) {
    if (typeof description !== 'string') return '';
    let s = description.trim();
    if (!s) return '';
    // A(MAZON|mazon|MZN)( (PRIME|Prime|MKTPL|MARK|Mktp US|RETA)|\.COM|\.com)\*\s*[A-Z0-9]+$ → AMAZON Purchase
    s = s.replace(/A(?:MAZON|mazon|MZN)(?:(?: (?:PRIME|Prime|MKTPL|MARK|Mktp US|RETA))|(?:\.COM|\.com))\*\s*[A-Z0-9]+$/i, 'AMAZON Purchase');
    // Store / ref numbers → " 000 " (sheet had \s*[A-Z]?[\d\-]{3,}\s*; that ate MEGAPLEX-03 as "X" + "-03").
    // Only treat (A) letter + digit tail when the letter is not part of a word, or (B) digit/hyphen run when not after a letter.
    s = s.replace(/\s*(?:(?<![A-Za-z])[A-Z][\d\-]{3,}|(?<![A-Za-z])[\d\-]{3,})\s*/g, ' 000 ');
    s = s.replace(/#\d+/g, '000');
    s = s.replace(/\d+\.\d+/g, 'N.NN');
    return s.trim();
  }

  /** LC from Work Tables column L */
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

module.exports = { CapitalOneParser };
