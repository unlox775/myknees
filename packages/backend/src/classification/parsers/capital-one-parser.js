const { BaseParser } = require('./BaseParser');

/**
 * Capital One parser. All Capital One–specific rules from Work Tables sheet (DCapN / DCap):
 * - Normalize Find/REPLACE (column M): Amazon pattern→"AMAZON Purchase", \s*[A-Z]?[\d\-]{3,}\s*→" 000 ", #\d+→"000", \d+\.\d+→N.NN
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
    // \s*[A-Z]?[\d\-]{3,}\s* → " 000 "
    s = s.replace(/\s*[A-Z]?[\d\-]{3,}\s*/g, ' 000 ');
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
