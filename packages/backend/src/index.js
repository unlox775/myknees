/**
 * Backend entry: config, DB, and repositories.
 */

const config = require('./config');
const { getKnex, destroyKnex } = require('./db/knex');
const accounts = require('./repositories/accounts');
const transactions = require('./repositories/transactions');
const lineItems = require('./repositories/line-items');
const transferRelationshipReconciler = require('./reconciliation/transfer-relationship-reconciler');
const relationshipStatus = require('./reconciliation/relationship-status');
const { runReconcileAfterImport } = require('./reconciliation/run-after-import');

module.exports = {
  config,
  getKnex,
  destroyKnex,
  accounts,
  transactions,
  lineItems,
  reconciliation: {
    ...transferRelationshipReconciler,
    ...relationshipStatus,
    runReconcileAfterImport,
  },
};
