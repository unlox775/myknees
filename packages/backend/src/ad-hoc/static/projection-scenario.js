(function () {
  const STORAGE_KEY = 'myknees.ad_hoc.projection_scenario_inputs.v1';
  const DEFAULT_ACCOUNT = 'Ally_Bank';
  const DEFAULT_START_MONTH = '2026-04';
  const DEFAULT_MONTHS = 6;
  const DEFAULT_WARNING_THRESHOLD = 500;
  const DEFAULT_LOOKBACK_MONTHS = 3;

  const moneyFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const statusEl = document.getElementById('scenario-status');
  const localStorageKeyEl = document.getElementById('scenario-local-storage-key');

  const accountInput = document.getElementById('scenario-account-input');
  const startMonthInput = document.getElementById('scenario-start-month-input');
  const monthsInput = document.getElementById('scenario-months-input');
  const warningThresholdInput = document.getElementById('scenario-warning-threshold-input');

  const runButton = document.getElementById('scenario-run-button');
  const reloadDefaultsButton = document.getElementById('scenario-reload-defaults-button');
  const resetButton = document.getElementById('scenario-reset-button');

  const answerSurvivalEl = document.getElementById('scenario-answer-survival');
  const answerLowestEl = document.getElementById('scenario-answer-lowest');
  const answerWarningEl = document.getElementById('scenario-answer-warning');
  const answerEdwardJonesEl = document.getElementById('scenario-answer-edward-jones');

  const coreAssumptionsBody = document.getElementById('scenario-core-assumptions-body');
  const edwardJonesBody = document.getElementById('scenario-edward-jones-body');
  const categoriesBody = document.getElementById('scenario-categories-body');
  const categoryWindowNoteEl = document.getElementById('scenario-category-window-note');

  const forecastSummaryEl = document.getElementById('scenario-forecast-summary');
  const monthTotalsBody = document.getElementById('scenario-month-totals-body');
  const forecastRowsBody = document.getElementById('scenario-forecast-rows-body');
  const balanceChartStatusEl = document.getElementById('scenario-balance-chart-status');
  const allyBalanceSummaryEl = document.getElementById('scenario-ally-balance-summary');
  const allyBalanceChartEl = document.getElementById('scenario-ally-balance-chart');
  const capitalOneSummaryEl = document.getElementById('scenario-capital-one-summary');
  const capitalOneChartEl = document.getElementById('scenario-capital-one-chart');

  const REQUIRED_PROFILE_KEYS = {
    parent_plus: 'parent_plus_monthly_start_2026_06',
    double_oven: 'double_oven_event_2026_05_15',
    vacation: 'family_vacation_event_2026_07_01',
  };

  const state = {
    local: {
      account: DEFAULT_ACCOUNT,
      start_month: DEFAULT_START_MONTH,
      months: DEFAULT_MONTHS,
      warning_balance_threshold: DEFAULT_WARNING_THRESHOLD,
      anchor_balance_override: '',
      profile_overrides: {},
      category_overrides: {},
    },
    defaults: {
      anchors: [],
      profiles: [],
      category_window: null,
      category_defaults: [],
    },
    latestForecast: null,
    capitalOneProjection: null,
    runTimer: null,
    loadToken: 0,
  };

  localStorageKeyEl.textContent = STORAGE_KEY;

  function formatAmount(value) {
    return moneyFormat.format(Number(value) || 0);
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type || ''}`.trim();
  }

  function emptyRow(bodyEl, colCount, text) {
    bodyEl.innerHTML = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colCount;
    cell.className = 'empty-cell';
    cell.textContent = text;
    row.appendChild(cell);
    bodyEl.appendChild(row);
  }

  function amountClass(value) {
    const n = Number(value);
    if (n < 0) return 'amount-negative';
    if (n > 0) return 'amount-positive';
    return '';
  }

  function readLocalStorageState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      return parsed;
    } catch (_err) {
      return null;
    }
  }

  function writeLocalStorageState() {
    const payload = {
      account: state.local.account,
      start_month: state.local.start_month,
      months: state.local.months,
      warning_balance_threshold: state.local.warning_balance_threshold,
      anchor_balance_override: state.local.anchor_balance_override,
      profile_overrides: state.local.profile_overrides,
      category_overrides: state.local.category_overrides,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function hydrateLocalState() {
    const persisted = readLocalStorageState();
    if (!persisted) return;

    state.local.account = String(persisted.account || DEFAULT_ACCOUNT).trim() || DEFAULT_ACCOUNT;
    state.local.start_month =
      /^\d{4}-\d{2}$/.test(String(persisted.start_month || ''))
        ? String(persisted.start_month)
        : DEFAULT_START_MONTH;

    const months = Number(persisted.months);
    if (Number.isInteger(months) && months >= 1 && months <= 12) {
      state.local.months = months;
    }

    const warning = Number(persisted.warning_balance_threshold);
    if (Number.isFinite(warning) && warning >= 0) {
      state.local.warning_balance_threshold = Number(warning.toFixed(2));
    }

    state.local.anchor_balance_override =
      persisted.anchor_balance_override == null ? '' : String(persisted.anchor_balance_override);

    if (
      persisted.profile_overrides &&
      typeof persisted.profile_overrides === 'object' &&
      !Array.isArray(persisted.profile_overrides)
    ) {
      state.local.profile_overrides = persisted.profile_overrides;
    }

    if (
      persisted.category_overrides &&
      typeof persisted.category_overrides === 'object' &&
      !Array.isArray(persisted.category_overrides)
    ) {
      state.local.category_overrides = persisted.category_overrides;
    }
  }

  function syncLocalStateToControls() {
    accountInput.value = state.local.account;
    startMonthInput.value = state.local.start_month;
    monthsInput.value = String(state.local.months);
    warningThresholdInput.value = String(state.local.warning_balance_threshold);
  }

  function resolveSelection() {
    const account = String(accountInput.value || '').trim() || DEFAULT_ACCOUNT;
    const startMonth = String(startMonthInput.value || '').trim() || DEFAULT_START_MONTH;
    const months = Number(monthsInput.value || DEFAULT_MONTHS);
    const warningThreshold = Number(warningThresholdInput.value || DEFAULT_WARNING_THRESHOLD);

    if (!/^\d{4}-\d{2}$/.test(startMonth)) {
      throw new Error('Start month must be YYYY-MM.');
    }

    if (!Number.isInteger(months) || months < 1 || months > 12) {
      throw new Error('Horizon must be an integer between 1 and 12.');
    }

    if (!Number.isFinite(warningThreshold) || warningThreshold < 0) {
      throw new Error('Low balance warning must be a number >= 0.');
    }

    return {
      account,
      startMonth,
      months,
      warningThreshold: Number(warningThreshold.toFixed(2)),
    };
  }

  function updateLocalStateFromControls() {
    const selection = resolveSelection();
    state.local.account = selection.account;
    state.local.start_month = selection.startMonth;
    state.local.months = selection.months;
    state.local.warning_balance_threshold = selection.warningThreshold;
    return selection;
  }

  function sanitizeNumericOverride(raw) {
    const token = String(raw == null ? '' : raw).trim();
    if (!token) return { empty: true, value: null, valid: true };
    const parsed = Number(token);
    if (!Number.isFinite(parsed) || parsed < 0) return { empty: false, value: null, valid: false };
    return { empty: false, value: Number(parsed.toFixed(2)), valid: true };
  }

  function sanitizeDateOverride(raw) {
    const token = String(raw == null ? '' : raw).trim();
    if (!token) return { empty: true, value: null, valid: true };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(token)) {
      return { empty: false, value: null, valid: false };
    }
    return { empty: false, value: token, valid: true };
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();

    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (_err) {
        throw new Error(`Unexpected response body (${response.status}).`);
      }
    }

    if (!response.ok) {
      const message = body && body.error ? body.error : `Request failed (${response.status}).`;
      throw new Error(message);
    }

    return body;
  }

  function profileByKey(profileKey) {
    return state.defaults.profiles.find((profile) => profile.profile_key === profileKey) || null;
  }

  function getAnchorDefault() {
    if (!Array.isArray(state.defaults.anchors) || !state.defaults.anchors.length) {
      return null;
    }
    return state.defaults.anchors[0];
  }

  function getProfileOverride(profileKey, fieldKey) {
    const profileEntry = state.local.profile_overrides[profileKey];
    if (!profileEntry || typeof profileEntry !== 'object') return '';
    const value = profileEntry[fieldKey];
    return value == null ? '' : String(value);
  }

  function setProfileOverride(profileKey, fieldKey, value) {
    const token = String(value == null ? '' : value).trim();
    if (!state.local.profile_overrides[profileKey] || typeof state.local.profile_overrides[profileKey] !== 'object') {
      state.local.profile_overrides[profileKey] = {};
    }

    if (!token) {
      delete state.local.profile_overrides[profileKey][fieldKey];
      if (Object.keys(state.local.profile_overrides[profileKey]).length === 0) {
        delete state.local.profile_overrides[profileKey];
      }
      return;
    }

    state.local.profile_overrides[profileKey][fieldKey] = token;
  }

  function getCategoryOverride(category) {
    const value = state.local.category_overrides[category];
    return value == null ? '' : String(value);
  }

  function setCategoryOverride(category, value) {
    const token = String(value == null ? '' : value).trim();
    if (!token) {
      delete state.local.category_overrides[category];
      return;
    }
    state.local.category_overrides[category] = token;
  }

  function buildCoreAssumptionRows() {
    const anchor = getAnchorDefault();

    return [
      {
        id: 'anchor_balance',
        label: 'Ally starting balance anchor',
        kind: 'anchor',
        type: 'amount',
        default_value: anchor ? Number(anchor.anchor_balance) : null,
      },
      {
        id: 'double_oven_amount',
        label: 'Double oven amount',
        kind: 'profile',
        profile_key: REQUIRED_PROFILE_KEYS.double_oven,
        field_key: 'amount_value',
        type: 'amount',
      },
      {
        id: 'double_oven_date',
        label: 'Double oven date',
        kind: 'profile',
        profile_key: REQUIRED_PROFILE_KEYS.double_oven,
        field_key: 'start_date',
        type: 'date',
      },
      {
        id: 'vacation_amount',
        label: 'Family vacation amount',
        kind: 'profile',
        profile_key: REQUIRED_PROFILE_KEYS.vacation,
        field_key: 'amount_value',
        type: 'amount',
      },
      {
        id: 'vacation_date',
        label: 'Family vacation date',
        kind: 'profile',
        profile_key: REQUIRED_PROFILE_KEYS.vacation,
        field_key: 'start_date',
        type: 'date',
      },
      {
        id: 'parent_plus_amount',
        label: 'Parent PLUS monthly amount',
        kind: 'profile',
        profile_key: REQUIRED_PROFILE_KEYS.parent_plus,
        field_key: 'amount_value',
        type: 'amount',
      },
      {
        id: 'parent_plus_start',
        label: 'Parent PLUS start date',
        kind: 'profile',
        profile_key: REQUIRED_PROFILE_KEYS.parent_plus,
        field_key: 'start_date',
        type: 'date',
      },
    ];
  }

  function formatDefaultValue(type, value) {
    if (value == null || value === '') return 'Unavailable';
    if (type === 'amount') return formatAmount(value);
    return String(value);
  }

  function renderCoreAssumptions() {
    const rows = buildCoreAssumptionRows();
    if (!rows.length) {
      emptyRow(coreAssumptionsBody, 5, 'No core assumptions available.');
      return;
    }

    coreAssumptionsBody.innerHTML = '';

    for (const rowDef of rows) {
      const row = document.createElement('tr');
      row.className = 'override-row';

      let defaultValue = rowDef.default_value;
      if (rowDef.kind === 'profile') {
        const profile = profileByKey(rowDef.profile_key);
        if (!profile) {
          defaultValue = null;
        } else {
          defaultValue = profile[rowDef.field_key];
        }
      }

      const labelCell = document.createElement('td');
      labelCell.textContent = rowDef.label;

      const defaultCell = document.createElement('td');
      defaultCell.textContent = formatDefaultValue(rowDef.type, defaultValue);

      const overrideCell = document.createElement('td');
      const overrideInput = document.createElement('input');
      overrideInput.type = rowDef.type === 'date' ? 'date' : 'number';
      if (rowDef.type === 'amount') {
        overrideInput.min = '0';
        overrideInput.step = '0.01';
      }
      overrideInput.className = 'override-input';

      let overrideValue = '';
      if (rowDef.kind === 'anchor') {
        overrideValue = state.local.anchor_balance_override || '';
      } else {
        overrideValue = getProfileOverride(rowDef.profile_key, rowDef.field_key);
      }
      overrideInput.value = overrideValue;
      overrideCell.appendChild(overrideInput);

      const effectiveCell = document.createElement('td');
      const stateCell = document.createElement('td');

      const refreshState = () => {
        let parsed;
        if (rowDef.type === 'amount') {
          parsed = sanitizeNumericOverride(overrideInput.value);
        } else {
          parsed = sanitizeDateOverride(overrideInput.value);
        }

        const overrideActive = !parsed.empty;
        if (overrideActive && !parsed.valid) {
          row.classList.add('override-invalid');
          row.classList.remove('override-active');
          effectiveCell.textContent = 'Invalid override';
          stateCell.textContent = 'invalid';
          return;
        }

        row.classList.remove('override-invalid');
        row.classList.toggle('override-active', overrideActive);

        const effectiveValue = overrideActive ? parsed.value : defaultValue;
        effectiveCell.textContent = formatDefaultValue(rowDef.type, effectiveValue);
        stateCell.textContent = overrideActive ? 'override' : 'default';
      };

      overrideInput.addEventListener('input', () => {
        if (rowDef.kind === 'anchor') {
          state.local.anchor_balance_override = String(overrideInput.value || '').trim();
        } else {
          setProfileOverride(rowDef.profile_key, rowDef.field_key, overrideInput.value);
        }
        writeLocalStorageState();
        refreshState();
        scheduleScenarioRun();
      });

      refreshState();

      row.appendChild(labelCell);
      row.appendChild(defaultCell);
      row.appendChild(overrideCell);
      row.appendChild(effectiveCell);
      row.appendChild(stateCell);
      coreAssumptionsBody.appendChild(row);
    }
  }

  function listEdwardJonesProfiles() {
    return state.defaults.profiles
      .filter(
        (profile) =>
          profile.pattern_type === 'paused_transfer' &&
          String(profile.profile_key || '').toLowerCase().includes('edward_jones')
      )
      .sort((left, right) => left.profile_name.localeCompare(right.profile_name));
  }

  function renderEdwardJonesProfiles() {
    const profiles = listEdwardJonesProfiles();

    if (!profiles.length) {
      emptyRow(edwardJonesBody, 7, 'No Edward Jones transfer templates available.');
      return;
    }

    edwardJonesBody.innerHTML = '';

    for (const profile of profiles) {
      const row = document.createElement('tr');
      row.className = 'override-row';

      const labelCell = document.createElement('td');
      labelCell.textContent = profile.profile_name;
      labelCell.title = profile.profile_key;

      const defaultAmountCell = document.createElement('td');
      defaultAmountCell.className = 'numeric';
      defaultAmountCell.textContent = formatAmount(profile.amount_value);

      const amountOverrideCell = document.createElement('td');
      const amountInput = document.createElement('input');
      amountInput.type = 'number';
      amountInput.min = '0';
      amountInput.step = '0.01';
      amountInput.value = getProfileOverride(profile.profile_key, 'amount_value');
      amountInput.className = 'override-input';
      amountOverrideCell.appendChild(amountInput);

      const defaultResumeCell = document.createElement('td');
      defaultResumeCell.textContent = profile.resume_date || 'none';

      const resumeOverrideCell = document.createElement('td');
      const resumeInput = document.createElement('input');
      resumeInput.type = 'date';
      resumeInput.value = getProfileOverride(profile.profile_key, 'resume_date');
      resumeInput.className = 'override-input';
      resumeOverrideCell.appendChild(resumeInput);

      const effectiveResumeCell = document.createElement('td');
      const stateCell = document.createElement('td');

      const refreshState = () => {
        const amountParsed = sanitizeNumericOverride(amountInput.value);
        const resumeParsed = sanitizeDateOverride(resumeInput.value);

        const invalid = (amountParsed.empty ? false : !amountParsed.valid) ||
          (resumeParsed.empty ? false : !resumeParsed.valid);

        const active = !amountParsed.empty || !resumeParsed.empty;

        row.classList.toggle('override-active', active && !invalid);
        row.classList.toggle('override-invalid', invalid);

        const effectiveResumeDate = !resumeParsed.empty
          ? resumeParsed.value
          : profile.resume_date || 'none';

        effectiveResumeCell.textContent = invalid ? 'Invalid override' : effectiveResumeDate;

        if (invalid) {
          stateCell.textContent = 'invalid';
        } else if (active) {
          stateCell.textContent = 'override';
        } else {
          stateCell.textContent = 'default';
        }
      };

      amountInput.addEventListener('input', () => {
        setProfileOverride(profile.profile_key, 'amount_value', amountInput.value);
        writeLocalStorageState();
        refreshState();
        scheduleScenarioRun();
      });

      resumeInput.addEventListener('input', () => {
        setProfileOverride(profile.profile_key, 'resume_date', resumeInput.value);
        writeLocalStorageState();
        refreshState();
        scheduleScenarioRun();
      });

      refreshState();

      row.appendChild(labelCell);
      row.appendChild(defaultAmountCell);
      row.appendChild(amountOverrideCell);
      row.appendChild(defaultResumeCell);
      row.appendChild(resumeOverrideCell);
      row.appendChild(effectiveResumeCell);
      row.appendChild(stateCell);
      edwardJonesBody.appendChild(row);
    }
  }

  function renderCategoryDefaults() {
    const categories = Array.isArray(state.defaults.category_defaults)
      ? state.defaults.category_defaults
      : [];

    if (!categories.length) {
      categoryWindowNoteEl.textContent = 'No expense category defaults were returned.';
      emptyRow(categoriesBody, 5, 'No category defaults available.');
      return;
    }

    const window = state.defaults.category_window;
    if (window) {
      categoryWindowNoteEl.textContent =
        `Defaults use signed transaction averages from ${window.start_month} to ${window.end_month}.`;
    } else {
      categoryWindowNoteEl.textContent = 'Defaults use recent transaction history.';
    }

    categoriesBody.innerHTML = '';

    for (const category of categories) {
      const row = document.createElement('tr');
      row.className = 'override-row';

      const categoryCell = document.createElement('td');
      categoryCell.textContent = category.category;

      const defaultCell = document.createElement('td');
      defaultCell.className = 'numeric';
      defaultCell.textContent = formatAmount(category.default_monthly_amount);

      const overrideCell = document.createElement('td');
      const overrideInput = document.createElement('input');
      overrideInput.type = 'number';
      overrideInput.min = '0';
      overrideInput.step = '0.01';
      overrideInput.value = getCategoryOverride(category.category);
      overrideInput.className = 'override-input';
      overrideCell.appendChild(overrideInput);

      const effectiveCell = document.createElement('td');
      effectiveCell.className = 'numeric';

      const stateCell = document.createElement('td');

      const refreshState = () => {
        const parsed = sanitizeNumericOverride(overrideInput.value);
        const active = !parsed.empty;
        const invalid = active && !parsed.valid;

        row.classList.toggle('override-active', active && !invalid);
        row.classList.toggle('override-invalid', invalid);

        if (invalid) {
          effectiveCell.textContent = 'Invalid override';
          stateCell.textContent = 'invalid';
          return;
        }

        const effectiveValue = active ? parsed.value : category.default_monthly_amount;
        effectiveCell.textContent = formatAmount(effectiveValue);
        stateCell.textContent = active ? 'override' : 'default';
      };

      overrideInput.addEventListener('input', () => {
        setCategoryOverride(category.category, overrideInput.value);
        writeLocalStorageState();
        refreshState();
        scheduleScenarioRun();
      });

      refreshState();

      row.appendChild(categoryCell);
      row.appendChild(defaultCell);
      row.appendChild(overrideCell);
      row.appendChild(effectiveCell);
      row.appendChild(stateCell);
      categoriesBody.appendChild(row);
    }
  }

  function renderScenarioAnswer(payload) {
    const answer = payload.scenario_answer || {};
    const warning = Number(answer.warning_balance_threshold || state.local.warning_balance_threshold);

    if (answer.survives_forecast_window) {
      answerSurvivalEl.textContent = 'Scenario survives the forecast window without dropping below $0.';
      answerSurvivalEl.className = 'answer-ok';
    } else {
      answerSurvivalEl.textContent =
        `Scenario drops below $0 on ${answer.first_negative_balance ? answer.first_negative_balance.date : 'unknown date'}.`;
      answerSurvivalEl.className = 'answer-danger';
    }

    if (answer.lowest_balance) {
      answerLowestEl.textContent =
        `Lowest projected balance: ${formatAmount(answer.lowest_balance.running_balance)} on ${answer.lowest_balance.date}.`;
    } else {
      answerLowestEl.textContent = 'Lowest projected balance is unavailable.';
    }

    answerWarningEl.textContent =
      `${answer.low_balance_row_count || 0} forecast rows fall below warning threshold ${formatAmount(warning)}.`;

    const edwardJonesSummary = evaluateEdwardJonesAffordability(payload.rows || []);
    answerEdwardJonesEl.textContent = edwardJonesSummary.text;
    answerEdwardJonesEl.className = edwardJonesSummary.className;
  }

  function monthLabel(monthKey) {
    const parts = String(monthKey || '').split('-');
    if (parts.length !== 2) return String(monthKey || '');
    return parts[1];
  }

  function renderEmptyChart(chartEl, summaryEl, message) {
    chartEl.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'balance-chart-empty';
    empty.textContent = message;
    chartEl.appendChild(empty);
    summaryEl.textContent = message;
  }

  function renderBalanceBarChart(chartEl, rows, options) {
    chartEl.innerHTML = '';

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'balance-chart-empty';
      empty.textContent = 'No monthly balances available.';
      chartEl.appendChild(empty);
      return;
    }

    const values = rows.map((row) => Number(row.balance) || 0);
    const maxValue = Math.max(...values, Number(options.limit || 0), 1);

    for (const rowData of rows) {
      const value = Number(rowData.balance) || 0;
      const column = document.createElement('div');
      column.className = 'balance-chart-column';

      const valueLabel = document.createElement('div');
      valueLabel.className = 'balance-chart-value';
      valueLabel.textContent = formatAmount(value);

      const track = document.createElement('div');
      track.className = 'balance-bar-track';

      const bar = document.createElement('div');
      const classes = ['balance-bar'];
      if (rowData.danger) classes.push('is-danger');
      if (rowData.warning) classes.push('is-warning');
      const heightPercent = Math.max(4, Math.min(100, (Math.abs(value) / maxValue) * 100));
      bar.className = classes.join(' ');
      bar.style.height = `${heightPercent}%`;
      bar.title = `${rowData.month_key}: ${formatAmount(value)}`;
      track.appendChild(bar);

      const label = document.createElement('div');
      label.className = 'balance-chart-month';
      label.textContent = monthLabel(rowData.month_key);
      label.title = rowData.month_key;

      column.appendChild(valueLabel);
      column.appendChild(track);
      column.appendChild(label);
      chartEl.appendChild(column);
    }
  }

  function renderBalanceProjectionCharts(payload) {
    const monthTotals = Array.isArray(payload.month_totals) ? payload.month_totals : [];
    const allyRows = monthTotals
      .filter((month) => month.ending_balance != null)
      .map((month) => ({
        month_key: month.month_key,
        balance: Number(month.ending_balance),
        warning: Number(month.ending_balance) < state.local.warning_balance_threshold,
        danger: Number(month.ending_balance) < 0,
      }));

    if (allyRows.length) {
      const lastAlly = allyRows[allyRows.length - 1];
      const lowestAlly = allyRows.reduce((lowest, row) =>
        Number(row.balance) < Number(lowest.balance) ? row : lowest
      );
      allyBalanceSummaryEl.textContent =
        `Ending ${formatAmount(lastAlly.balance)}; lowest ${formatAmount(lowestAlly.balance)} in ${lowestAlly.month_key}.`;
      renderBalanceBarChart(allyBalanceChartEl, allyRows, {
        limit: Math.max(...allyRows.map((row) => Number(row.balance) || 0)),
      });
    } else {
      renderEmptyChart(allyBalanceChartEl, allyBalanceSummaryEl, 'No Ally balance forecast available.');
    }

    const capitalOne = state.capitalOneProjection;
    const capitalRows = capitalOne && Array.isArray(capitalOne.months)
      ? capitalOne.months.map((month) => ({
        month_key: month.month_key,
        balance: Number(month.projected_balance),
        warning: Boolean(month.near_limit),
        danger: Boolean(month.over_limit),
      }))
      : [];

    if (capitalOne && capitalRows.length) {
      const crossing = capitalOne.limit_crossing_month
        ? ` Crosses ${formatAmount(capitalOne.credit_limit)} in ${capitalOne.limit_crossing_month}.`
        : ` Does not cross ${formatAmount(capitalOne.credit_limit)} in this window.`;
      const monthlyDelta = capitalOne.lookback_window
        ? Number(capitalOne.lookback_window.average_monthly_debt_delta)
        : 0;

      capitalOneSummaryEl.textContent =
        `Current imported balance ${formatAmount(capitalOne.current_debt_balance)} as of ` +
        `${capitalOne.latest_transaction_date || 'latest import'}; estimated monthly change ` +
        `${formatAmount(monthlyDelta)}.${crossing}`;
      renderBalanceBarChart(capitalOneChartEl, capitalRows, {
        limit: Number(capitalOne.credit_limit) || 25000,
      });
    } else {
      renderEmptyChart(
        capitalOneChartEl,
        capitalOneSummaryEl,
        'Capital One projection unavailable. The Ally forecast still updated.'
      );
    }

    balanceChartStatusEl.textContent =
      'Charts update from the current scenario run. Capital One is an imported-transaction trend estimate, not a full statement model.';
  }

  function evaluateEdwardJonesAffordability(rows) {
    const profiles = listEdwardJonesProfiles();
    const resumeDates = [];

    for (const profile of profiles) {
      const overrideValue = getProfileOverride(profile.profile_key, 'resume_date');
      const parsed = sanitizeDateOverride(overrideValue);
      if (!parsed.empty && parsed.valid) {
        resumeDates.push(parsed.value);
      } else if (profile.resume_date) {
        resumeDates.push(profile.resume_date);
      }
    }

    if (!resumeDates.length) {
      return {
        text: 'Edward Jones resume date is not set in current scenario inputs.',
        className: 'answer-neutral',
      };
    }

    const earliestResume = resumeDates.sort((a, b) => a.localeCompare(b))[0];
    const cashRows = rows.filter((row) => !row.is_non_cash && row.date >= earliestResume);

    if (!cashRows.length) {
      return {
        text: `Edward Jones resume is set to ${earliestResume}, but no forecast rows exist after that date.`,
        className: 'answer-neutral',
      };
    }

    let minBalance = cashRows[0].running_balance;
    for (const row of cashRows) {
      if (Number(row.running_balance) < Number(minBalance)) {
        minBalance = row.running_balance;
      }
    }

    if (Number(minBalance) >= 0) {
      return {
        text: `Edward Jones resume from ${earliestResume} appears affordable (post-resume minimum ${formatAmount(minBalance)}).`,
        className: 'answer-ok',
      };
    }

    return {
      text: `Edward Jones resume from ${earliestResume} is not affordable in this scenario (post-resume minimum ${formatAmount(minBalance)}).`,
      className: 'answer-danger',
    };
  }

  function renderForecast(payload) {
    state.latestForecast = payload;

    const totals = payload.totals || {};
    forecastSummaryEl.textContent =
      `Rows: ${totals.row_count || 0}, income ${formatAmount(totals.income_total)}, expenses ${formatAmount(
        totals.expense_total
      )}, net ${formatAmount(totals.net_total)}, ending balance ${formatAmount(totals.ending_balance)}.`;

    const warningThreshold = state.local.warning_balance_threshold;

    const monthTotals = Array.isArray(payload.month_totals) ? payload.month_totals : [];
    if (!monthTotals.length) {
      emptyRow(monthTotalsBody, 5, 'No month totals available.');
    } else {
      monthTotalsBody.innerHTML = '';
      for (const month of monthTotals) {
        const row = document.createElement('tr');
        const endingBalance = Number(month.ending_balance);
        row.className = endingBalance < 0
          ? 'running-balance-danger'
          : endingBalance < warningThreshold
            ? 'running-balance-warning'
            : '';

        const monthCell = document.createElement('td');
        monthCell.textContent = month.month_key;

        const incomeCell = document.createElement('td');
        incomeCell.className = `numeric ${amountClass(month.income_total)}`.trim();
        incomeCell.textContent = formatAmount(month.income_total);

        const expenseCell = document.createElement('td');
        expenseCell.className = `numeric ${amountClass(month.expense_total)}`.trim();
        expenseCell.textContent = formatAmount(month.expense_total);

        const netCell = document.createElement('td');
        netCell.className = `numeric ${amountClass(month.net_total)}`.trim();
        netCell.textContent = formatAmount(month.net_total);

        const endingCell = document.createElement('td');
        endingCell.className = 'numeric';
        endingCell.textContent = month.ending_balance == null ? '' : formatAmount(month.ending_balance);

        row.appendChild(monthCell);
        row.appendChild(incomeCell);
        row.appendChild(expenseCell);
        row.appendChild(netCell);
        row.appendChild(endingCell);
        monthTotalsBody.appendChild(row);
      }
    }

    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (!rows.length) {
      emptyRow(forecastRowsBody, 7, 'No forecast rows available.');
    } else {
      forecastRowsBody.innerHTML = '';
      for (const rowData of rows) {
        const row = document.createElement('tr');
        const runningBalance = Number(rowData.running_balance);
        row.className = runningBalance < 0
          ? 'running-balance-danger'
          : runningBalance < warningThreshold
            ? 'running-balance-warning'
            : '';

        const dateCell = document.createElement('td');
        dateCell.textContent = rowData.date;

        const profileCell = document.createElement('td');
        profileCell.textContent = rowData.profile_name;
        profileCell.title = rowData.profile_key;

        const categoryCell = document.createElement('td');
        categoryCell.textContent = rowData.category || '';

        const amountCell = document.createElement('td');
        amountCell.className = `numeric ${amountClass(rowData.amount)}`.trim();
        amountCell.textContent = formatAmount(rowData.amount);

        const runningCell = document.createElement('td');
        runningCell.className = `numeric ${amountClass(rowData.running_balance)}`.trim();
        runningCell.textContent = formatAmount(rowData.running_balance);

        const rowTypeCell = document.createElement('td');
        rowTypeCell.textContent = rowData.row_type;

        const sourceCell = document.createElement('td');
        sourceCell.textContent = `${rowData.source_type}: ${rowData.source_note}`;

        row.appendChild(dateCell);
        row.appendChild(profileCell);
        row.appendChild(categoryCell);
        row.appendChild(amountCell);
        row.appendChild(runningCell);
        row.appendChild(rowTypeCell);
        row.appendChild(sourceCell);
        forecastRowsBody.appendChild(row);
      }
    }

    renderScenarioAnswer(payload);
    renderBalanceProjectionCharts(payload);
  }

  function buildScenarioOverridesPayload(selection) {
    const payload = {
      warning_balance_threshold: selection.warningThreshold,
      profile_overrides: {},
      category_overrides: {},
      category_default_window: state.defaults.category_window
        ? {
          start_month: state.defaults.category_window.start_month,
          end_month: state.defaults.category_window.end_month,
        }
        : null,
    };

    const anchorParsed = sanitizeNumericOverride(state.local.anchor_balance_override);
    if (!anchorParsed.empty) {
      if (!anchorParsed.valid) {
        throw new Error('Starting balance override is invalid.');
      }
      payload.anchor_balance_override = anchorParsed.value;
    }

    for (const [profileKey, fields] of Object.entries(state.local.profile_overrides)) {
      if (!fields || typeof fields !== 'object') continue;
      const patch = {};

      for (const [fieldKey, rawValue] of Object.entries(fields)) {
        if (fieldKey === 'amount_value') {
          const parsed = sanitizeNumericOverride(rawValue);
          if (parsed.empty) continue;
          if (!parsed.valid) {
            throw new Error(`Invalid amount override for profile ${profileKey}.`);
          }
          patch[fieldKey] = parsed.value;
          continue;
        }

        if (fieldKey === 'start_date' || fieldKey === 'resume_date' || fieldKey === 'end_date') {
          const parsed = sanitizeDateOverride(rawValue);
          if (parsed.empty) continue;
          if (!parsed.valid) {
            throw new Error(`Invalid date override for profile ${profileKey}.`);
          }
          patch[fieldKey] = parsed.value;
          continue;
        }
      }

      if (Object.keys(patch).length > 0) {
        payload.profile_overrides[profileKey] = patch;
      }
    }

    for (const [category, rawValue] of Object.entries(state.local.category_overrides)) {
      const parsed = sanitizeNumericOverride(rawValue);
      if (parsed.empty) continue;
      if (!parsed.valid) {
        throw new Error(`Invalid category override for ${category}.`);
      }
      payload.category_overrides[category] = parsed.value;
    }

    if (!payload.category_default_window) {
      delete payload.category_default_window;
    }

    if (Object.keys(payload.profile_overrides).length === 0) {
      delete payload.profile_overrides;
    }

    if (Object.keys(payload.category_overrides).length === 0) {
      delete payload.category_overrides;
    }

    return payload;
  }

  async function runScenarioForecast() {
    let selection;
    try {
      selection = updateLocalStateFromControls();
    } catch (err) {
      setStatus(err.message, 'status-error');
      return;
    }

    writeLocalStorageState();
    runButton.disabled = true;

    try {
      const overrides = buildScenarioOverridesPayload(selection);
      setStatus('Running scenario forecast with current defaults + overrides...');

      const forecastRequest = fetchJson(
        `/api/ad-hoc/projections/forecast?account=${encodeURIComponent(
          selection.account
        )}&start_month=${encodeURIComponent(selection.startMonth)}&months=${selection.months}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scenario_overrides: overrides,
          }),
        }
      );
      const capitalOneRequest = fetchJson(
        `/api/ad-hoc/projections/credit-balance?credit_account=Capital_One` +
          `&start_month=${encodeURIComponent(selection.startMonth)}` +
          `&months=${selection.months}&credit_limit=25000&lookback_months=${DEFAULT_LOOKBACK_MONTHS}`
      ).catch((err) => ({
        ok: false,
        error: err.message,
      }));

      const [response, capitalOneProjection] = await Promise.all([forecastRequest, capitalOneRequest]);
      state.capitalOneProjection = capitalOneProjection && capitalOneProjection.ok
        ? capitalOneProjection
        : null;

      renderForecast(response);
      setStatus('Scenario forecast updated.', 'status-ok');
    } catch (err) {
      setStatus(err.message, 'status-error');
      emptyRow(monthTotalsBody, 5, 'Failed to compute month totals.');
      emptyRow(forecastRowsBody, 7, 'Failed to compute forecast rows.');
      renderEmptyChart(allyBalanceChartEl, allyBalanceSummaryEl, 'Forecast error.');
      renderEmptyChart(capitalOneChartEl, capitalOneSummaryEl, 'Capital One projection unavailable.');
      balanceChartStatusEl.textContent = 'Balance charts unavailable due to forecast error.';
      answerSurvivalEl.textContent = 'Scenario answer unavailable due to forecast error.';
      answerLowestEl.textContent = '';
      answerWarningEl.textContent = '';
      answerEdwardJonesEl.textContent = '';
    } finally {
      runButton.disabled = false;
    }
  }

  function scheduleScenarioRun(delayMs = 350) {
    if (state.runTimer) {
      clearTimeout(state.runTimer);
    }
    state.runTimer = setTimeout(() => {
      state.runTimer = null;
      runScenarioForecast();
    }, delayMs);
  }

  async function loadScenarioDefaults() {
    let selection;
    try {
      selection = updateLocalStateFromControls();
    } catch (err) {
      setStatus(err.message, 'status-error');
      return;
    }

    writeLocalStorageState();
    runButton.disabled = true;
    reloadDefaultsButton.disabled = true;

    const token = state.loadToken + 1;
    state.loadToken = token;

    try {
      setStatus(`Loading backend defaults for ${selection.account}...`);

      const queryBase = `account=${encodeURIComponent(selection.account)}`;
      const [anchorsPayload, profilesPayload, categoryDefaultsPayload] = await Promise.all([
        fetchJson(`/api/ad-hoc/projections/anchors?${queryBase}`),
        fetchJson(`/api/ad-hoc/projections/profiles?${queryBase}`),
        fetchJson(
          `/api/ad-hoc/projections/category-defaults?${queryBase}` +
            `&forecast_start_month=${encodeURIComponent(selection.startMonth)}` +
            `&lookback_months=${DEFAULT_LOOKBACK_MONTHS}`
        ),
      ]);

      if (token !== state.loadToken) {
        return;
      }

      state.defaults.anchors = Array.isArray(anchorsPayload.anchors) ? anchorsPayload.anchors : [];
      state.defaults.profiles = Array.isArray(profilesPayload.profiles) ? profilesPayload.profiles : [];
      state.defaults.category_window = categoryDefaultsPayload.category_window || null;
      state.defaults.category_defaults = Array.isArray(categoryDefaultsPayload.categories)
        ? categoryDefaultsPayload.categories
        : [];

      renderCoreAssumptions();
      renderEdwardJonesProfiles();
      renderCategoryDefaults();

      await runScenarioForecast();
    } catch (err) {
      setStatus(err.message, 'status-error');
      emptyRow(coreAssumptionsBody, 5, 'Failed to load core assumptions.');
      emptyRow(edwardJonesBody, 7, 'Failed to load Edward Jones assumptions.');
      emptyRow(categoriesBody, 5, 'Failed to load category defaults.');
      emptyRow(monthTotalsBody, 5, 'Forecast unavailable.');
      emptyRow(forecastRowsBody, 7, 'Forecast unavailable.');
    } finally {
      runButton.disabled = false;
      reloadDefaultsButton.disabled = false;
    }
  }

  function resetLocalOverrides() {
    state.local.anchor_balance_override = '';
    state.local.profile_overrides = {};
    state.local.category_overrides = {};
    writeLocalStorageState();
    renderCoreAssumptions();
    renderEdwardJonesProfiles();
    renderCategoryDefaults();
    scheduleScenarioRun(10);
  }

  function registerControlListeners() {
    runButton.addEventListener('click', () => {
      runScenarioForecast();
    });

    reloadDefaultsButton.addEventListener('click', () => {
      loadScenarioDefaults();
    });

    resetButton.addEventListener('click', () => {
      resetLocalOverrides();
    });

    const reloadOnChange = () => {
      try {
        updateLocalStateFromControls();
        writeLocalStorageState();
        loadScenarioDefaults();
      } catch (err) {
        setStatus(err.message, 'status-error');
      }
    };

    accountInput.addEventListener('change', reloadOnChange);
    startMonthInput.addEventListener('change', reloadOnChange);
    monthsInput.addEventListener('change', reloadOnChange);

    warningThresholdInput.addEventListener('input', () => {
      try {
        updateLocalStateFromControls();
        writeLocalStorageState();
        scheduleScenarioRun();
      } catch (err) {
        setStatus(err.message, 'status-error');
      }
    });
  }

  hydrateLocalState();
  syncLocalStateToControls();

  emptyRow(coreAssumptionsBody, 5, 'Loading assumptions...');
  emptyRow(edwardJonesBody, 7, 'Loading Edward Jones settings...');
  emptyRow(categoriesBody, 5, 'Loading category defaults...');
  emptyRow(monthTotalsBody, 5, 'Loading forecast summary...');
  emptyRow(forecastRowsBody, 7, 'Loading forecast rows...');
  renderEmptyChart(allyBalanceChartEl, allyBalanceSummaryEl, 'Loading Ally balance chart...');
  renderEmptyChart(capitalOneChartEl, capitalOneSummaryEl, 'Loading Capital One balance chart...');

  registerControlListeners();
  loadScenarioDefaults();
})();
