const { renderAdHocPage } = require('./ui-shell');

function renderCategoryTrendsPage() {
  const bodyHtml = `
<main class="ad-hoc-main">
  <section class="panel page-intro">
    <h1>Category Trends</h1>
    <p>
      Choose a category, review month-by-month totals across a range, and click any month
      to inspect the transactions behind that category total.
    </p>
    <div class="controls" role="group" aria-label="Category trend controls">
      <label class="control-field" for="trend-preset-select">
        <span>Range Preset</span>
        <select id="trend-preset-select">
          <option value="last_12_months">Last 12 Months</option>
          <option value="year_to_date">Year to Date</option>
          <option value="custom">Custom Range</option>
        </select>
      </label>
      <label class="control-field" for="trend-start-month">
        <span>Start Month</span>
        <select id="trend-start-month"></select>
      </label>
      <label class="control-field" for="trend-end-month">
        <span>End Month</span>
        <select id="trend-end-month"></select>
      </label>
      <label class="control-field control-field-wide" for="trend-category-select">
        <span>Category</span>
        <select id="trend-category-select"></select>
      </label>
      <button id="load-category-trend-button" type="button">Load Trend</button>
    </div>
    <p class="status" id="trend-status">Loading default range and categories...</p>
    <p class="fine-print" id="trend-cutoff-note"></p>
  </section>

  <section class="panel">
    <h2>Monthly Totals For Selected Category</h2>
    <p id="trend-summary" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="Category monthly trend table">
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col" class="numeric">Transactions</th>
            <th scope="col" class="numeric">Total Amount</th>
            <th scope="col">Relative Spend</th>
          </tr>
        </thead>
        <tbody id="trend-month-table-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Category Detail For Selected Month</h2>
    <p id="trend-detail-selected" class="fine-print">No month selected.</p>
    <p class="fine-print">
      Pivot to month-first review:
      <a id="trend-pivot-link" href="/ad-hoc/month-buckets">Open month bucket browser</a>
    </p>
    <div class="table-wrap">
      <table aria-label="Category month detail table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Account</th>
            <th scope="col" class="numeric">Amount</th>
            <th scope="col">Normalized Description</th>
            <th scope="col">Default Rule Category</th>
            <th scope="col">Override Category</th>
            <th scope="col" class="numeric">Tx ID</th>
          </tr>
        </thead>
        <tbody id="trend-detail-table-body"></tbody>
      </table>
    </div>
  </section>
</main>`;

  return renderAdHocPage({
    title: 'MyKnees - Category Trends',
    activeNavKey: 'category-trends',
    bodyHtml,
    scriptPath: '/ad-hoc/static/category-trends.js',
  });
}

module.exports = {
  renderCategoryTrendsPage,
};
