const { renderAdHocPage } = require('./ui-shell');

function renderProjectionPage() {
  const bodyHtml = `
<main class="ad-hoc-main">
  <section class="panel page-intro">
    <h1>Projection Profiles + Forecast API</h1>
    <p>
      Review forecast assumptions, seeded profiles, inferred candidates, and six-to-twelve-month
      forecast rows with traceable source notes.
    </p>
    <div class="controls" role="group" aria-label="Projection controls">
      <label class="control-field" for="projection-account-input">
        <span>Account</span>
        <input id="projection-account-input" type="text" value="Ally_Bank" />
      </label>
      <label class="control-field" for="projection-start-month-input">
        <span>Start Month</span>
        <input id="projection-start-month-input" type="month" value="2026-04" />
      </label>
      <label class="control-field" for="projection-months-input">
        <span>Horizon (months)</span>
        <input id="projection-months-input" type="number" min="1" max="24" value="6" />
      </label>
      <button id="projection-load-button" type="button">Load Forecast</button>
      <button id="projection-refresh-candidates-button" type="button">Refresh Inferred Candidates</button>
    </div>
    <p class="status" id="projection-status">Loading projection data...</p>
    <p class="fine-print">
      Sign convention: income is positive, expense is negative. Paused transfer rows appear as
      non-cash notices with zero amount.
    </p>
  </section>

  <section class="panel">
    <h2>Anchors</h2>
    <p id="projection-anchor-summary" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="Projection anchors table">
        <thead>
          <tr>
            <th scope="col">Anchor Date</th>
            <th scope="col" class="numeric">Anchor Balance</th>
            <th scope="col">Anchor Transaction</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody id="projection-anchors-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Projection Profiles</h2>
    <p id="projection-profile-summary" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="Projection profile table">
        <thead>
          <tr>
            <th scope="col">Profile</th>
            <th scope="col">Pattern</th>
            <th scope="col">Direction</th>
            <th scope="col" class="numeric">Amount</th>
            <th scope="col">Start</th>
            <th scope="col">Status</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody id="projection-profiles-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Inferred Recurring Candidates</h2>
    <p id="projection-candidate-summary" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="Projection inferred candidates table">
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Pattern</th>
            <th scope="col">Direction</th>
            <th scope="col" class="numeric">Amount Estimate</th>
            <th scope="col" class="numeric">Months Seen</th>
            <th scope="col">Confidence</th>
          </tr>
        </thead>
        <tbody id="projection-candidates-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Forecast Summary</h2>
    <p id="projection-forecast-summary" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="Forecast month totals table">
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col" class="numeric">Income</th>
            <th scope="col" class="numeric">Expenses</th>
            <th scope="col" class="numeric">Net</th>
            <th scope="col" class="numeric">Ending Balance</th>
          </tr>
        </thead>
        <tbody id="projection-month-totals-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Forecast Rows</h2>
    <div class="table-wrap">
      <table aria-label="Forecast rows table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Profile</th>
            <th scope="col">Pattern</th>
            <th scope="col" class="numeric">Amount</th>
            <th scope="col" class="numeric">Running Balance</th>
            <th scope="col">Source</th>
            <th scope="col">Confidence</th>
          </tr>
        </thead>
        <tbody id="projection-forecast-rows-body"></tbody>
      </table>
    </div>
  </section>
</main>`;

  return renderAdHocPage({
    title: 'MyKnees - Projection Profiles + Forecast API',
    activeNavKey: 'projection',
    bodyHtml,
    scriptPath: '/ad-hoc/static/projection.js',
  });
}

module.exports = {
  renderProjectionPage,
};
