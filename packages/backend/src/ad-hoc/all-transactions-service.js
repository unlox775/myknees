const {
  DEFAULT_FORMAT_FILTER,
  resolveMonthWindow,
  fetchMonthBucketData,
} = require('./month-bucket-service');

const ALL_ACCOUNTS_TOKEN = 'all';
const ALL_MONTHS_TOKEN = 'all';

function parseAccountFilter(searchParams) {
  const raw = String(searchParams.get('account') || '').trim();
  if (!raw) return ALL_ACCOUNTS_TOKEN;
  if (raw.toLowerCase() === ALL_ACCOUNTS_TOKEN) return ALL_ACCOUNTS_TOKEN;
  return raw;
}

function amountNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num;
}

function parseYear(searchParams) {
  const now = new Date();
  const rawYear = searchParams.get('year');
  const year = rawYear == null || rawYear === '' ? now.getFullYear() : parseInt(String(rawYear).trim(), 10);
  if (!Number.isInteger(year) || year < 1970 || year > 3000) {
    throw new Error(`Invalid year value: ${rawYear}`);
  }
  return year;
}

function resolveTransactionsWindow(searchParams) {
  const rawMonth = String(searchParams.get('month') || '').trim().toLowerCase();
  if (rawMonth === ALL_MONTHS_TOKEN) {
    const year = parseYear(searchParams);
    return {
      year,
      month: null,
      month_scope: ALL_MONTHS_TOKEN,
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      label: `${year}-01-01 ... ${year}-12-31`,
      display_label: `All months ${year}`,
    };
  }

  return {
    ...resolveMonthWindow(searchParams),
    month_scope: 'single',
  };
}

async function listAccountCatalog(knex) {
  const rows = await knex('accounts')
    .select('identifier', 'name')
    .orderBy('identifier', 'asc');

  return rows.map((row) => ({
    identifier: row.identifier,
    name: row.name || row.identifier,
  }));
}

function resolveAccountIdentifier(accountCatalog, accountFilter) {
  if (accountFilter === ALL_ACCOUNTS_TOKEN) return ALL_ACCOUNTS_TOKEN;
  const byLower = new Map();
  for (const row of accountCatalog) {
    byLower.set(String(row.identifier).toLowerCase(), row.identifier);
  }
  return byLower.get(String(accountFilter).toLowerCase()) || null;
}

async function fetchAllTransactionsMonthData(knex, searchParams, options = {}) {
  const monthWindow = resolveTransactionsWindow(searchParams);
  const includeLinked = Boolean(options.includeLinked);
  const formatFilter = Array.isArray(options.formatFilter)
    ? options.formatFilter
    : DEFAULT_FORMAT_FILTER;
  const accountFilterToken = parseAccountFilter(searchParams);

  const accountCatalog = await listAccountCatalog(knex);
  const resolvedAccountIdentifier = resolveAccountIdentifier(accountCatalog, accountFilterToken);
  if (resolvedAccountIdentifier == null) {
    throw new Error(`Unknown account identifier: ${accountFilterToken}`);
  }

  const monthReport = await fetchMonthBucketData(knex, monthWindow, {
    includeLinked,
    formatFilter,
  });

  const countsByAccount = new Map();
  const totalsByAccount = new Map();
  for (const tx of monthReport.transactions) {
    countsByAccount.set(tx.account_identifier, (countsByAccount.get(tx.account_identifier) || 0) + 1);
    totalsByAccount.set(
      tx.account_identifier,
      (totalsByAccount.get(tx.account_identifier) || 0) + amountNumber(tx.amount)
    );
  }

  const availableAccounts = accountCatalog.map((account) => ({
    identifier: account.identifier,
    name: account.name,
    month_transaction_count: countsByAccount.get(account.identifier) || 0,
    month_total_amount: Number((totalsByAccount.get(account.identifier) || 0).toFixed(2)),
  }));

  const selectedAccountIdentifier = resolvedAccountIdentifier;
  const selectedAccount = selectedAccountIdentifier === ALL_ACCOUNTS_TOKEN
    ? {
        identifier: ALL_ACCOUNTS_TOKEN,
        name: 'All accounts',
      }
    : availableAccounts.find((account) => account.identifier === selectedAccountIdentifier) || {
        identifier: selectedAccountIdentifier,
        name: selectedAccountIdentifier,
      };

  const filteredTransactions = selectedAccountIdentifier === ALL_ACCOUNTS_TOKEN
    ? [...monthReport.transactions]
    : monthReport.transactions.filter((row) => row.account_identifier === selectedAccountIdentifier);

  const filteredTotalAmount = filteredTransactions.reduce(
    (sum, row) => sum + amountNumber(row.amount),
    0
  );

  return {
    window: monthReport.window,
    include_linked: monthReport.include_linked,
    format_filter: monthReport.format_filter,
    scanned_transaction_count: monthReport.scanned_transaction_count,
    skipped_by_format: monthReport.skipped_by_format,
    linked_target_count: monthReport.linked_target_count,
    account_filter: selectedAccountIdentifier,
    selected_account: selectedAccount,
    available_accounts: availableAccounts,
    month_transaction_count_all_accounts: monthReport.totals.transaction_count,
    month_total_amount_all_accounts: monthReport.totals.total_amount,
    transaction_count: filteredTransactions.length,
    total_amount: Number(filteredTotalAmount.toFixed(2)),
    transactions: filteredTransactions,
  };
}

module.exports = {
  ALL_ACCOUNTS_TOKEN,
  ALL_MONTHS_TOKEN,
  fetchAllTransactionsMonthData,
};
