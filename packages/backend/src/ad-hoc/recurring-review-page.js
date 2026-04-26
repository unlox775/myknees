const { renderAdHocPage } = require('./ui-shell');

function renderRecurringReviewPage() {
  const bodyHtml = `
<main class="ad-hoc-main">
  <section class="panel page-intro">
    <h1>Recurring Review + Subscription Detector</h1>
    <p>
      Detect recurring charges across recent history, review cadence confidence with compact
      month-by-month evidence, and toggle candidates off to model hypothetical savings.
    </p>
    <div class="controls" role="group" aria-label="Recurring review controls">
      <label class="control-field control-field-wide" for="recurring-accounts-input">
        <span>Accounts (comma-separated or all)</span>
        <input id="recurring-accounts-input" type="text" value="Ally_Bank,Capital_One,Chase_VISA" />
      </label>
      <label class="control-field" for="recurring-sort-select">
        <span>Sort</span>
        <select id="recurring-sort-select">
          <option value="confidence_desc">High confidence first</option>
          <option value="monthly_equivalent_desc">Highest monthly equivalent</option>
          <option value="annual_equivalent_desc">Highest annual equivalent</option>
          <option value="subscriptions_first">Subscriptions first</option>
          <option value="annual_first">Annual first</option>
          <option value="essential_first">Essential first</option>
        </select>
      </label>
      <label class="control-field" for="recurring-label-filter-select">
        <span>Filter</span>
        <select id="recurring-label-filter-select">
          <option value="all">All labels</option>
          <option value="discretionary">Discretionary</option>
          <option value="essential">Essential</option>
          <option value="unknown">Unknown</option>
          <option value="subscription">Subscription</option>
          <option value="annual">Annual</option>
          <option value="every-other-month">Every-other-month</option>
          <option value="low-confidence">Low confidence</option>
        </select>
      </label>
      <button id="recurring-load-button" type="button">Load Recurring Review</button>
    </div>
    <p class="status" id="recurring-status">Loading recurring candidates...</p>
    <p class="fine-print" id="recurring-cutoff-note"></p>
    <p class="fine-print">
      Keep toggles are hypothetical planning controls. Unchecking an essential bill computes math,
      but does not imply cancellation is appropriate.
    </p>
  </section>

  <section class="panel">
    <h2>Savings Modeling</h2>
    <div class="scenario-answer-grid" id="recurring-savings-grid"></div>
  </section>

  <section class="panel">
    <h2>Recurring Candidates</h2>
    <p id="recurring-table-summary" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="Recurring candidate review table">
        <thead>
          <tr>
            <th scope="col">Keep</th>
            <th scope="col">Candidate</th>
            <th scope="col">Labels</th>
            <th scope="col">Cadence / Confidence</th>
            <th scope="col">Last Seen</th>
            <th scope="col" class="numeric">Monthly Eq</th>
            <th scope="col" class="numeric">Annual Eq</th>
            <th scope="col">24-Month History</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody id="recurring-candidates-body"></tbody>
      </table>
    </div>
  </section>
</main>`;

  return renderAdHocPage({
    title: 'MyKnees - Recurring Review + Subscription Detector',
    activeNavKey: 'subscriptions',
    bodyHtml,
    scriptPath: '/ad-hoc/static/recurring-review.js',
  });
}

module.exports = {
  renderRecurringReviewPage,
};
