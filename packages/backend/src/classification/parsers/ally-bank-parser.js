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
    // Ally → Capital One: strip trailing auth-date noise so card vs loan lines bucket reliably
    s = s.replace(/\bAuthDate\s+[\w-]+\b/gi, '').trim();
    return s.trim();
  }

  /**
   * Ally export mixes Capital One **credit card** payments with **auto loan** direct pays.
   * Reconciliation should use one stable normalized phrase per bucket (see reconciliation patterns).
   */
  capitalOnePayeeBucket(scrubbed) {
    if (typeof scrubbed !== 'string' || !scrubbed) return scrubbed;
    const u = scrubbed.toUpperCase();
    if (!u.includes('CAPITAL') || !u.includes('ONE')) return scrubbed;
    // Auto / installment (not the credit card we reconcile to Capital_One card ledger)
    if (/\bAUTO\s*DIRECT\s*PAY\b/i.test(u) || /\bAUTO\s*DIRECTPAY\b/i.test(u) || /\bAUTOLOAN\b/i.test(u)) {
      return 'Capital One auto loan payment';
    }
    // Card payments from checking → match credits on the card account
    if (
      /\bCRCARDPMT\b/i.test(u) ||
      /\bCRCARD\b/i.test(u) ||
      /\bMOBILE\s*PMT\b/i.test(u) ||
      /\bONLINE\s*PMT\b/i.test(u) ||
      /\bONLINE\s*PAYMENT\b/i.test(u) ||
      /\bCARD\s*PMT\b/i.test(u)
    ) {
      return 'Capital One card payment';
    }
    return scrubbed;
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
    const scrubbed = this.preScrub(description);
    const bucketed = this.capitalOnePayeeBucket(scrubbed);
    return this.lc(bucketed);
  }
}

module.exports = { AllyBankParser };
