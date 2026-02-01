const allyBankParser = require('./parsers/ally-bank-parser');
const capitalOneParser = require('./parsers/capital-one-parser');
const costcoParser = require('./parsers/costco-parser');

const PARSERS = {
  ally_bank: allyBankParser,
  capital_one: capitalOneParser,
  costco_receipts: costcoParser,
};

/**
 * @param {string} formatIdentifier - ally_bank, capital_one, costco_receipts
 * @returns {{ normalize: (d: string) => string }|null}
 */
function getParser(formatIdentifier) {
  return PARSERS[formatIdentifier] || null;
}

module.exports = { getParser, PARSERS };
