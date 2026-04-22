const { CapitalOneParser } = require('./capital-one-parser');

/**
 * Chase Visa: Capital One CSV + pre-scrub/LC pipeline, then account-specific merges
 * (Sunlight / Skyridge / Smith’s / Megaplex / UVU / Water Gardens / BCS split lines / Recreation.gov).
 */
class ChaseVisaParser extends CapitalOneParser {
  /**
   * @param {string} description
   */
  normalize(description) {
    const base = super.normalize(description);
    if (!base) return base;
    return chaseVisaPostMerge(base);
  }
}

/**
 * @param {string} s — already lowercased / scrubbed like capital_one output
 */
function chaseVisaPostMerge(s) {
  let t = String(s).trim();
  if (!t) return t;

  // Cluster 8: split-transaction suffixes (no longer tied to "dash" after LC)
  t = t.replace(/\s+g\s+sneaky(\s+fix)?\s*$/i, '').trim();

  // Cluster 1: Square prefix
  if (t === 'sq sunlight family' || /^sq\s+sunlight\s+family$/i.test(t)) t = 'sunlight family';

  // Cluster 2: Skyridge showtix variants
  if (/^skyridge hig/.test(t)) t = 'skyridge hig showtix';

  // Cluster 3: Smith’s marketplace variants
  if (t === 'smith mrktpl' || t === 'smiths mrktpl' || t === 'smiths mrktpl 000') t = 'smiths marketplace';

  // Cluster 4: Megaplex + location codes
  if (t === 'megaplex' || /^megaplex\d+$/.test(t)) t = 'megaplex';

  // Cluster 5: Utah Valley University
  if (t === 'v utah valley university') t = 'utah valley university';

  // Cluster 7: Water Gardens Cinema
  if (t.startsWith('water gardens cinema')) t = 'water gardens cinema';

  // Cluster 10: Recreation.gov
  if (t === 'recreationgov' || t === 'recreation gov') t = 'recreation gov';

  return t;
}

module.exports = { ChaseVisaParser, chaseVisaPostMerge };
