const { AllyBankParser } = require('./parsers/ally-bank-parser');
const { CapitalOneParser } = require('./parsers/capital-one-parser');
const { CostcoParser } = require('./parsers/costco-parser');

const PARSERS = {
  ally_bank: new AllyBankParser(),
  capital_one: new CapitalOneParser(),
  costco_receipts: new CostcoParser(),
};

/**
 * @param {string} formatIdentifier - ally_bank, capital_one, costco_receipts
 * @returns {{ normalize: (d: string) => string }|null}
 */
function getParser(formatIdentifier) {
  return PARSERS[formatIdentifier] || null;
}

module.exports = { getParser, PARSERS };
