/**
 * Backend entry: config, DB, and repositories.
 */

const config = require('./config');
const { getKnex, destroyKnex } = require('./db/knex');
const accounts = require('./repositories/accounts');
const transactions = require('./repositories/transactions');
const lineItems = require('./repositories/line-items');

module.exports = {
  config,
  getKnex,
  destroyKnex,
  accounts,
  transactions,
  lineItems,
};
