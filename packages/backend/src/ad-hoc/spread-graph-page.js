const { renderAdHocPage } = require('./ui-shell');

function renderSpreadGraphPage() {
  const bodyHtml = `
<main class="ad-hoc-main spread-graph-main">
  <section class="panel page-intro">
    <h1>Spread Graph</h1>
    <p>
      View the last three months of expenses as a stacked category area graph. Each transaction is
      spread across days using a selectable shape so chunky charges can be viewed as daily burn.
    </p>
    <div class="controls" role="group" aria-label="Spread graph controls">
      <label class="control-field" for="spread-end-month">
        <span>Ending month</span>
        <select id="spread-end-month"></select>
      </label>
      <label class="control-field" for="spread-default-shape">
        <span>Default shape</span>
        <select id="spread-default-shape">
          <option value="wave">Wave</option>
          <option value="triangle">Triangle</option>
          <option value="quarter-circle">Quarter-Circle</option>
          <option value="brick">Brick</option>
        </select>
      </label>
      <label class="control-field control-field-slider" for="spread-default-days">
        <span>Default days: <strong id="spread-default-days-label">7</strong></span>
        <input id="spread-default-days" type="range" min="1" max="60" step="1" value="7" />
      </label>
      <label class="control-field control-field-checkbox" for="spread-flatten-recurring">
        <span>Flatten recurring Series</span>
        <input id="spread-flatten-recurring" type="checkbox" />
      </label>
      <button id="spread-load-button" type="button">Load Graph</button>
    </div>
    <p class="status" id="spread-status">Loading spread graph...</p>
    <p class="fine-print" id="spread-cutoff-note"></p>
  </section>

  <section class="panel">
    <h2>Daily Spread by Category</h2>
    <div id="spread-legend" class="spread-legend"></div>
    <div class="spread-chart-wrap">
      <svg id="spread-chart" class="spread-chart" role="img" aria-label="Stacked expense spread graph"></svg>
      <div id="spread-transaction-tooltip" class="spread-transaction-tooltip" hidden></div>
    </div>
  </section>

  <section class="panel">
    <h2>Category Spread Overrides</h2>
    <p class="fine-print">
      Rows follow the same order as the graph bands. Sort order is anchored to the prior January
      totals to avoid flip-flopping between similar categories.
    </p>
    <div id="spread-category-controls" class="spread-category-controls"></div>
  </section>
</main>`;

  return renderAdHocPage({
    title: 'MyKnees - Spread Graph',
    activeNavKey: 'spread-graph',
    bodyHtml,
    scriptPath: '/ad-hoc/static/spread-graph.js',
  });
}

module.exports = {
  renderSpreadGraphPage,
};
