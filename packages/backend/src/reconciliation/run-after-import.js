/**
 * Optional post-import hook: run active transfer reconciliation relationships
 * that involve the given account.
 */

const { runReconcileForAccounts } = require('./transfer-relationship-reconciler');

/**
 * @param {import('knex').Knex} knex
 * @param {number} accountId
 * @returns {Promise<{ ran: object[], summary: { linked: number, relationships: number } } | { error: string, ran: [] }>}
 */
async function runReconcileAfterImport(knex, accountId) {
  try {
    return await runReconcileForAccounts(knex, [accountId]);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return { error: message, ran: [], summary: { linked: 0, relationships: 0 } };
  }
}

module.exports = { runReconcileAfterImport };
