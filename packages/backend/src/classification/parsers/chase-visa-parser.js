const { CapitalOneParser } = require('./capital-one-parser');

/** Chase Visa: Capital One pipeline + account-specific merges (not Lehi Jr vs Lehi High). */
class ChaseVisaParser extends CapitalOneParser {
  normalize(description) {
    const base = super.normalize(description);
    if (!base) return base;
    return chaseVisaPostMerge(base);
  }
}

function chaseVisaPostMerge(s) {
  let t = String(s).trim();
  if (!t) return t;
  t = t.replace(/\s+g\s+sneaky(\s+fix)?\s*$/i, '').trim();
  if (t === 'sq sunlight family' || /^sq\s+sunlight\s+family$/i.test(t)) t = 'sunlight family';
  if (/^skyridge hig/.test(t)) t = 'skyridge hig showtix';
  if (t === 'smith mrktpl' || t === 'smiths mrktpl' || t === 'smiths mrktpl 000') t = 'smiths marketplace';
  if (t === 'megaplex' || /^megaplex\d+$/.test(t)) t = 'megaplex';
  if (t === 'v utah valley university') t = 'utah valley university';
  if (t.startsWith('water gardens cinema')) t = 'water gardens cinema';
  if (t === 'recreationgov' || t === 'recreation gov') t = 'recreation gov';
  return t;
}

module.exports = { ChaseVisaParser, chaseVisaPostMerge };
