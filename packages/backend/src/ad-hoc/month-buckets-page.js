const { renderAdHocPage } = require('./ui-shell');

function renderMonthBucketsPage() {
  const bodyHtml = `
<main class="ad-hoc-main">
  <section class="panel page-intro">
    <h1>Monthly Bucket Browser</h1>
    <p>
      Choose a year and month, review totals by bucket, and click any bucket to inspect
      the transactions behind that number.
    </p>
    <div class="controls" role="group" aria-label="Month controls">
      <label class="control-field" for="year-input">
        <span>Year</span>
        <input id="year-input" type="number" inputmode="numeric" min="1970" max="3000" />
      </label>
      <label class="control-field" for="month-select">
        <span>Month</span>
        <select id="month-select"></select>
      </label>
      <button id="load-month-button" type="button">Load Month</button>
    </div>
    <p class="status" id="month-status">Loading current month...</p>
    <p class="fine-print">
      Transaction detail shows normalized descriptions. Hover that column to see the raw
      imported description.
    </p>
  </section>

  <section class="panel">
    <h2>Bucket Summary</h2>
    <p id="summary-totals" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="Bucket summary table">
        <thead>
          <tr>
            <th scope="col">Bucket</th>
            <th scope="col" class="numeric">Transactions</th>
            <th scope="col" class="numeric">Total Amount</th>
          </tr>
        </thead>
        <tbody id="summary-table-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Bucket Detail</h2>
    <p id="detail-selected-bucket" class="fine-print">No bucket selected.</p>
    <div class="table-wrap">
      <table aria-label="Bucket detail table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Account</th>
            <th scope="col" class="numeric">Amount</th>
            <th scope="col">Normalized Description</th>
            <th scope="col">Default Rule Bucket</th>
            <th scope="col">Override Bucket</th>
            <th scope="col" class="numeric">Tx ID</th>
          </tr>
        </thead>
        <tbody id="detail-table-body"></tbody>
      </table>
    </div>
  </section>
</main>`;

  return renderAdHocPage({
    title: 'MyKnees - Monthly Bucket Browser',
    activeNavKey: 'month-buckets',
    bodyHtml,
    scriptPath: '/ad-hoc/static/month-buckets.js',
  });
}

module.exports = {
  renderMonthBucketsPage,
};
