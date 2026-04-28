const { renderAdHocPage } = require('./ui-shell');

function renderProjectionScenarioPage() {
  const bodyHtml = `
<main class="ad-hoc-main">
  <section class="panel page-intro">
    <h1>Six-Month Projection Scenario</h1>
    <p>
      Adjust default assumptions, keep local browser-only overrides, and recalculate the six-month
      Ally Bank cash path using projection APIs.
    </p>
    <div class="controls" role="group" aria-label="Scenario controls">
      <label class="control-field" for="scenario-account-input">
        <span>Account</span>
        <input id="scenario-account-input" type="text" value="Ally_Bank" />
      </label>
      <label class="control-field" for="scenario-start-month-input">
        <span>Start Month</span>
        <input id="scenario-start-month-input" type="month" value="2026-04" />
      </label>
      <label class="control-field" for="scenario-months-input">
        <span>Horizon (months)</span>
        <input id="scenario-months-input" type="number" min="1" max="12" value="6" />
      </label>
      <label class="control-field" for="scenario-warning-threshold-input">
        <span>Low Balance Warning</span>
        <input id="scenario-warning-threshold-input" type="number" min="0" step="0.01" value="500" />
      </label>
      <button id="scenario-run-button" type="button">Run Scenario</button>
      <button id="scenario-reload-defaults-button" type="button">Reload Defaults</button>
      <button id="scenario-reset-button" type="button">Reset Local Overrides</button>
    </div>
    <p class="status" id="scenario-status">Loading scenario defaults...</p>
    <p class="fine-print">
      Blank override fields use backend defaults. Filled overrides are applied to forecast requests.
      Local storage key: <code id="scenario-local-storage-key"></code>
    </p>
  </section>

  <section class="panel balance-projection-panel">
    <h2>Balance Projection</h2>
    <p id="scenario-balance-chart-status" class="fine-print">Balance charts loading...</p>
    <div class="balance-chart-stack" aria-label="Projected account balance charts">
      <article class="balance-chart-card">
        <div class="balance-chart-card-header">
          <h3>Ally Bank Projected Balance</h3>
          <p id="scenario-ally-balance-summary" class="fine-print">Waiting for forecast...</p>
        </div>
        <div id="scenario-ally-balance-chart" class="balance-chart" role="img" aria-label="Ally Bank projected balance by month"></div>
      </article>
      <article class="balance-chart-card">
        <div class="balance-chart-card-header">
          <h3>Capital One Estimated Balance</h3>
          <p id="scenario-capital-one-summary" class="fine-print">Waiting for Capital One estimate...</p>
        </div>
        <div id="scenario-capital-one-chart" class="balance-chart" role="img" aria-label="Capital One estimated balance by month"></div>
      </article>
    </div>
  </section>

  <section class="panel">
    <h2>Scenario Answer</h2>
    <div id="scenario-answer" class="scenario-answer-grid">
      <p id="scenario-answer-survival">Survival answer loading...</p>
      <p id="scenario-answer-lowest">Lowest balance loading...</p>
      <p id="scenario-answer-warning">Warning threshold summary loading...</p>
      <p id="scenario-answer-edward-jones">Edward Jones resume affordability loading...</p>
    </div>
  </section>

  <section class="panel">
    <h2>Core Assumptions</h2>
    <div class="table-wrap">
      <table aria-label="Core projection assumptions table">
        <thead>
          <tr>
            <th scope="col">Assumption</th>
            <th scope="col">Backend Default</th>
            <th scope="col">Override</th>
            <th scope="col">Effective</th>
            <th scope="col">State</th>
          </tr>
        </thead>
        <tbody id="scenario-core-assumptions-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Edward Jones Resume Settings</h2>
    <div class="table-wrap">
      <table aria-label="Edward Jones resume settings table">
        <thead>
          <tr>
            <th scope="col">Transfer Template</th>
            <th scope="col">Default Amount</th>
            <th scope="col">Amount Override</th>
            <th scope="col">Default Resume Date</th>
            <th scope="col">Resume Date Override</th>
            <th scope="col">Effective Resume Date</th>
            <th scope="col">State</th>
          </tr>
        </thead>
        <tbody id="scenario-edward-jones-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Category Monthly Assumptions (Recent Actuals)</h2>
    <p id="scenario-category-window-note" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="Category monthly assumption table">
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Default Monthly Amount</th>
            <th scope="col">Override Monthly Amount</th>
            <th scope="col">Effective Monthly Amount</th>
            <th scope="col">State</th>
          </tr>
        </thead>
        <tbody id="scenario-categories-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Forecast Month Totals</h2>
    <p id="scenario-forecast-summary" class="fine-print"></p>
    <div class="table-wrap">
      <table aria-label="Scenario month totals table">
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col" class="numeric">Income</th>
            <th scope="col" class="numeric">Expenses</th>
            <th scope="col" class="numeric">Net</th>
            <th scope="col" class="numeric">Ending Balance</th>
          </tr>
        </thead>
        <tbody id="scenario-month-totals-body"></tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>Forecast Rows</h2>
    <div class="table-wrap">
      <table aria-label="Scenario forecast rows table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Profile</th>
            <th scope="col">Category</th>
            <th scope="col" class="numeric">Amount</th>
            <th scope="col" class="numeric">Running Balance</th>
            <th scope="col">Row Type</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody id="scenario-forecast-rows-body"></tbody>
      </table>
    </div>
  </section>
</main>`;

  return renderAdHocPage({
    title: 'MyKnees - Six-Month Projection Scenario',
    activeNavKey: 'projection-scenario',
    bodyHtml,
    scriptPath: '/ad-hoc/static/projection-scenario.js',
  });
}

module.exports = {
  renderProjectionScenarioPage,
};
