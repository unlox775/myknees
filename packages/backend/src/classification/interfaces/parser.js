/**
 * Parser interface: all format parsers extend BaseParser and implement normalize(description).
 * BaseParser lives in parsers/BaseParser.js; this file documents the contract.
 *
 * Contract:
 *   - normalize(description: string) => string   (required; subclass must implement)
 *
 * Each format has its own pre-scrub and LC logic from the XLSX Work Tables sheet;
 * there is no shared LC—each parser implements its full algorithm.
 *
 * To add a new format: create a class that extends BaseParser and implement normalize().
 */

const { BaseParser } = require('../parsers/BaseParser');

module.exports = { BaseParser };
