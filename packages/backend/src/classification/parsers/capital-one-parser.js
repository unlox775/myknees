const { BaseParser } = require('./BaseParser');

/**
 * Capital One parser. All Capital One–specific rules from Work Tables sheet (DCapN / DCap):
 * - Normalize Find/REPLACE (column M): Amazon pattern→"AMAZON Purchase", store/ref digit runs→" 000 ", #\d+→"000", \d+\.\d+→N.NN
 *   (Digit-run rule tightened vs sheet literal: require code not to start mid-word, so MEGAPLEX-03 keeps the X.)
 *   Split letters+long-digit-run before digit collapse (SHELL OIL10007… → OIL 10007…) so digits are not glued into words.
 *   (Sheet also prefixes category J&" / "; we only normalize description here.)
 * - LC() (column L): LOWER(M), strip (^\s+|[^\s\w/]|\s+$), collapse \s+ to single space
 * - collapseMerchantAliases: strip a lone digit after a 2+ letter token (app8→app); merchant buckets (Walmart, Shell, etc.).
 */

class CapitalOneParser extends BaseParser {
  /** Pre-scrub from Work Tables column M formula (description-only part) */
  preScrub(description) {
    if (typeof description !== 'string') return '';
    let s = description.trim();
    if (!s) return '';
    // AMZN / Amazon marketplace card line: ref + Amzn.com/bill… — same bucket as sheet “Amazon * ref” (do not require $).
    s = s.replace(
      /\b(?:AMZN|Amazon)\s+M[Kk][Tt][Pp]\s+US(?:\*[A-Za-z0-9]+)?[\s\S]*$/i,
      'AMAZON Purchase'
    );
    // A(MAZON|mazon|MZN)( (PRIME|Prime|MKTPL|MARK|Mktp US|RETA)|\.COM|\.com)\*\s*[A-Z0-9]+$ → AMAZON Purchase
    s = s.replace(/A(?:MAZON|mazon|MZN)(?:(?: (?:PRIME|Prime|MKTPL|MARK|Mktp US|RETA))|(?:\.COM|\.com))\*\s*[A-Z0-9]+$/i, 'AMAZON Purchase');
    // Letters glued to a long digit run (SHELL OIL10007…, WALMART.COM800…, CHICKFILA APP866…) → split so digit rule
    // does not treat the first digit as part of the word (e.g. oil1).
    s = s.replace(/([A-Za-z]{2,})(\d{3,})/g, '$1 $2');
    // Store / ref numbers → " 000 " (sheet had \s*[A-Z]?[\d\-]{3,}\s*; that ate MEGAPLEX-03 as "X" + "-03").
    // Only treat (A) letter + digit tail when the letter is not part of a word, or (B) digit/hyphen run when not after a letter.
    s = s.replace(/\s*(?:(?<![A-Za-z])[A-Z][\d\-]{3,}|(?<![A-Za-z])[\d\-]{3,})\s*/g, ' 000 ');
    s = s.replace(/#\d+/g, '000');
    s = s.replace(/\d+\.\d+/g, 'N.NN');
    // Statement text often glues PYMT + AuthDate with no space; split so AuthDate strip works.
    s = s.replace(/(PYMT|PMT)(AuthDate)/gi, '$1 $2');
    s = s.replace(/\bAuthDate\s+[\w-]+\b/gi, '').trim();
    return s.trim();
  }

  /**
   * Credits that are “bank paid my card” lines — one stable phrase for transfer reconciliation.
   * (Purchases and other activity stay as-is.)
   */
  bankPaymentCreditBucket(scrubbed) {
    if (typeof scrubbed !== 'string' || !scrubbed) return scrubbed;
    const u = scrubbed.toUpperCase();
    const isCo = /\bCAPITAL\s+ONE\b/i.test(scrubbed);
    // Mobile payment shorthand on card ledger (often no “thank you” line)
    if (isCo && /\bMOBILE\s+PYMT\b/.test(u)) return 'Capital One card payment received';
    if (isCo && /\bMOBILE\s+PMT\b/.test(u)) return 'Capital One card payment received';
    if (/\bMOBILE\s+PAYMENT\b/.test(u) && /\bTHANK/.test(u)) return 'Capital One card payment received';
    if (/\bCAPITAL\s+ONE\s+AUTOPAY\b/i.test(scrubbed)) return 'Capital One card payment received';
    if (/\bAUTOPAY\b/.test(u) && /\bTHANK/.test(u)) return 'Capital One card payment received';
    if (/\bAUTOPAY\s+PYMT\b/.test(u) || /\bAUTO\s+PAYMENT\b/.test(u)) return 'Capital One card payment received';
    if (/\bPAYMENT\s+RECEIVED\b/.test(u) && isCo) return 'Capital One card payment received';
    if (/\bONLINE\s+PAYMENT\b/.test(u) && /\bTHANK/.test(u)) return 'Capital One card payment received';
    if (/\bINTERNET\s+PAYMENT\b/.test(u) && isCo) return 'Capital One card payment received';
    return scrubbed;
  }

  /** LC from Work Tables column L */
  lc(description) {
    if (typeof description !== 'string') return '';
    let s = description.toLowerCase().trim();
    s = s.replace(/^\s+|[^\s\w/]|\s+$/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  /**
   * After LC: strip one trailing digit from a token that is 2+ letters + single digit (app8, oil1, fuel4, wa1).
   */
  stripLonelyDigitAfterWordTokens(s) {
    return s
      .split(/\s+/)
      .map((tok) => tok.replace(/^([a-z]{2,})\d$/i, '$1'))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Final merchant buckets after LC — collapses obvious same-merchant variants.
   * Costco WHSE vs GAS left distinct. Fred Meyer fuel vs store left distinct.
   */
  collapseMerchantAliases(s) {
    if (typeof s !== 'string' || !s) return s;
    let t = this.stripLonelyDigitAfterWordTokens(s.trim());
    if (!t) return t;

    // Safety: any remaining AMZN Mktp US tail after scrub → same label as preScrub AMAZON Purchase.
    if (/^amzn mktp us/i.test(t)) return 'amazon purchase';

    if (/^amazoncom/i.test(t)) return 'amazon purchase';
    if (/^amazon mktpl/i.test(t)) return 'amazon purchase';
    if (/^amazon prime/i.test(t)) return 'amazon prime subscription';
    if (/^audible(?:com|[a-z0-9]*(?:\s+[a-z0-9]+)*)?$/i.test(t)) return 'audible';

    if (/^mcdonalds\b/i.test(t)) return 'mcdonalds';
    if (/^little caesars\b/i.test(t)) return 'little caesars';
    if (/^papa murphys\b/i.test(t)) return 'papa murphys';
    if (/^el ranchon mexican rest/i.test(t)) return 'el ranchon mexican restaurant';
    if (/^chatgpt subscription/i.test(t)) return 'chatgpt subscription';

    if (/^steamgamescom/i.test(t) || /^steam purchase/i.test(t) || /^wl steam purchase/i.test(t)) {
      return 'steam purchase';
    }

    if (/^heavenly donuts/i.test(t)) return 'heavenly donuts';
    if (/^medsummit pacific medica/i.test(t)) return 'summit pacific medical center';

    if (/^walmartcom/i.test(t)) return 'walmart com';
    if (/^walmart\b/i.test(t)) return 'walmart';

    if (/^dollartree/i.test(t) || /^dollar tree/i.test(t)) return 'dollar tree';

    if (/^wendys\b/i.test(t)) return 'wendys';

    if (/^chickfila app/i.test(t)) return 'chickfila app';
    if (/^chickfila\b/i.test(t)) return 'chickfila';

    if (/^shell oil/i.test(t)) return 'shell oil';

    if (/^fred meyer fuel/i.test(t)) return 'fred meyer fuel';
    if (/^fredmeyer/i.test(t) || /^fred meyer\b/i.test(t)) return 'fred meyer';

    if (/^elma feed/i.test(t)) return 'elma feed farm supply';

    if (/^wpycity of elma utilitie/i.test(t) || /^city of elma utilities/i.test(t)) {
      return 'city of elma utilities';
    }

    if (/^ross store/i.test(t)) return 'ross stores';

    return t;
  }

  normalize(description) {
    const scrubbed = this.preScrub(description);
    const bucketed = this.bankPaymentCreditBucket(scrubbed);
    const lowered = this.lc(bucketed);
    return this.collapseMerchantAliases(lowered);
  }
}

module.exports = { CapitalOneParser };
