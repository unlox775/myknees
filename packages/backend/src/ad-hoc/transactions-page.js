const { renderAdHocPage } = require('./ui-shell');

function renderTransactionsPage() {
  const bodyHtml = `
<main class="ad-hoc-main">
  <section class="panel page-intro">
    <h1>All Transactions</h1>
    <p>
      Load one month at a time, filter by account, and use instant text search to quickly
      find the exact transaction you remember.
    </p>
    <div class="controls" role="group" aria-label="All transactions controls">
      <label class="control-field" for="transactions-year-input">
        <span>Year</span>
        <input id="transactions-year-input" type="number" inputmode="numeric" min="1970" max="3000" />
      </label>
      <label class="control-field" for="transactions-month-select">
        <span>Month</span>
        <select id="transactions-month-select"></select>
      </label>
      <label class="control-field control-field-wide" for="transactions-account-select">
        <span>Account</span>
        <select id="transactions-account-select"></select>
      </label>
      <button id="transactions-load-button" type="button">Load Transactions</button>
      <label class="control-field control-field-search" for="transactions-search-input">
        <span>Search (instant, local)</span>
        <input
          id="transactions-search-input"
          type="search"
          placeholder="date, amount, merchant, account, category, or tx id"
        />
      </label>
    </div>
    <p class="status" id="transactions-status">Loading current month...</p>
    <p class="fine-print">
      Search does not call the backend per keystroke. It filters the currently loaded month/account rows in the browser.
      Normalized descriptions are shown directly; raw imported text is available as secondary text and hover title.
    </p>
  </section>

  <section class="panel">
    <h2>Transactions</h2>
    <p id="transactions-summary" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="All transactions table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Account</th>
            <th scope="col" class="numeric">Amount</th>
            <th scope="col">Normalized Description</th>
            <th scope="col">Category</th>
            <th scope="col">Override Category</th>
            <th scope="col" class="numeric">Tx ID</th>
          </tr>
        </thead>
        <tbody id="transactions-table-body"></tbody>
      </table>
    </div>
  </section>
</main>`;

  return renderAdHocPage({
    title: 'MyKnees - All Transactions',
    activeNavKey: 'transactions',
    bodyHtml,
    extraScriptPaths: ['/ad-hoc/static/transaction-category-editor.js'],
    scriptPath: '/ad-hoc/static/transactions.js',
  });
}

module.exports = {
  renderTransactionsPage,
};
