const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

/**
 * @returns {import('plaid').PlaidApi}
 */
function createPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error('Set PLAID_CLIENT_ID and PLAID_SECRET (see docs/plaid-automatic-import.md)');
  }

  const basePath = resolveBasePath();

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });
  return new PlaidApi(configuration);
}

function resolveBasePath() {
  if (process.env.PLAID_BASE_PATH) return process.env.PLAID_BASE_PATH.trim();
  const env = (process.env.PLAID_ENV || 'sandbox').toLowerCase();
  if (env === 'production') return PlaidEnvironments.production;
  if (env === 'development') return 'https://development.plaid.com';
  return PlaidEnvironments.sandbox;
}

module.exports = { createPlaidClient, resolveBasePath };
