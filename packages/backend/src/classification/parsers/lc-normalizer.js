/**
 * LC (lowercase + clean) normalizer used by Ally Bank and others.
 * Matches the sheet formula: REGEXREPLACE(REGEXREPLACE(LOWER(A4), "(^\s+|[^\s\w/]|\s+$)",""),"\s+","")
 * - Lowercase
 * - Strip leading/trailing whitespace and any character that isn't space, word char, or /
 * - Collapse multiple spaces to one
 */

function lcNormalize(description) {
  if (typeof description !== 'string') return '';
  let s = description.toLowerCase().trim();
  // Remove chars that aren't space, word, or /
  s = s.replace(/[^\s\w/]/g, ' ');
  // Collapse spaces
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

module.exports = { lcNormalize };
