(function () {
  const moneyFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const statusEl = document.getElementById('projection-status');
  const accountInput = document.getElementById('projection-account-input');
  const startMonthInput = document.getElementById('projection-start-month-input');
  const monthsInput = document.getElementById('projection-months-input');
  const loadButton = document.getElementById('projection-load-button');
  const refreshCandidatesButton = document.getElementById('projection-refresh-candidates-button');

  const anchorSummaryEl = document.getElementById('projection-anchor-summary');
  const anchorsBody = document.getElementById('projection-anchors-body');

  const profileSummaryEl = document.getElementById('projection-profile-summary');
  const profilesBody = document.getElementById('projection-profiles-body');

  const candidateSummaryEl = document.getElementById('projection-candidate-summary');
  const candidatesBody = document.getElementById('projection-candidates-body');

  const forecastSummaryEl = document.getElementById('projection-forecast-summary');
  const monthTotalsBody = document.getElementById('projection-month-totals-body');
  const forecastRowsBody = document.getElementById('projection-forecast-rows-body');

  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className = `status ${type || ''}`.trim();
  }

  function amountClass(value) {
    const n = Number(value);
    if (n < 0) return 'amount-negative';
    if (n > 0) return 'amount-positive';
    return '';
  }

  function formatAmount(value) {
    return moneyFormat.format(Number(value) || 0);
  }

  function emptyRow(bodyEl, colCount, message) {
    bodyEl.innerHTML = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colCount;
    cell.className = 'empty-cell';
    cell.textContent = message;
    row.appendChild(cell);
    bodyEl.appendChild(row);
  }

  function resolveSelection() {
    const account = String(accountInput.value || '').trim() || 'Ally_Bank';
    const startMonth = String(startMonthInput.value || '').trim() || '2026-04';
    const months = Number(monthsInput.value || '6');

    if (!/^\d{4}-\d{2}$/.test(startMonth)) {
      throw new Error('Start month must be YYYY-MM.');
    }

    if (!Number.isInteger(months) || months < 1 || months > 24) {
      throw new Error('Horizon must be an integer between 1 and 24 months.');
    }

    return { account, startMonth, months };
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

  function renderAnchors(payload) {
    const anchors = Array.isArray(payload.anchors) ? payload.anchors : [];
    anchorSummaryEl.textContent = `${anchors.length} anchor(s) for ${payload.account_identifier}.`;

    if (!anchors.length) {
      emptyRow(anchorsBody, 4, 'No anchors found for this account.');
      return;
    }

    anchorsBody.innerHTML = '';

    for (const anchor of anchors) {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = anchor.anchor_date;

      const balanceCell = document.createElement('td');
      balanceCell.className = 'numeric';
      balanceCell.textContent = formatAmount(anchor.anchor_balance);

      const transactionCell = document.createElement('td');
      transactionCell.textContent = anchor.anchor_transaction_description || '';

      const sourceCell = document.createElement('td');
      sourceCell.textContent = `${anchor.source_type}: ${anchor.source_note}`;

      row.appendChild(dateCell);
      row.appendChild(balanceCell);
      row.appendChild(transactionCell);
      row.appendChild(sourceCell);

      anchorsBody.appendChild(row);
    }
  }

  function renderProfiles(payload) {
    const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    profileSummaryEl.textContent = `${profiles.length} active profile(s). Sign convention: income positive, expense negative.`;

    if (!profiles.length) {
      emptyRow(profilesBody, 7, 'No profiles found for this account.');
      return;
    }

    profilesBody.innerHTML = '';

    for (const profile of profiles) {
      const row = document.createElement('tr');

      const profileCell = document.createElement('td');
      profileCell.textContent = profile.profile_name;
      profileCell.title = profile.profile_key;

      const patternCell = document.createElement('td');
      patternCell.textContent = profile.pattern_type;

      const directionCell = document.createElement('td');
      directionCell.textContent = profile.direction;

      const amountCell = document.createElement('td');
      amountCell.className = 'numeric';
      amountCell.textContent = profile.amount_mode === 'paycheck_percent_plus_monthly_extra'
        ? `${(Number(profile.amount_value) * 100).toFixed(1)}%`
        : formatAmount(profile.amount_value);

      const startCell = document.createElement('td');
      startCell.textContent = profile.start_date;

      const statusCell = document.createElement('td');
      statusCell.textContent = profile.paused
        ? profile.resume_date
          ? `paused until ${profile.resume_date}`
          : 'paused (no resume date)'
        : profile.active
          ? 'active'
          : 'inactive';

      const sourceCell = document.createElement('td');
      sourceCell.textContent = `${profile.source_type}: ${profile.source_note}`;
      sourceCell.title = profile.assumption_note || '';

      row.appendChild(profileCell);
      row.appendChild(patternCell);
      row.appendChild(directionCell);
      row.appendChild(amountCell);
      row.appendChild(startCell);
      row.appendChild(statusCell);
      row.appendChild(sourceCell);

      profilesBody.appendChild(row);
    }
  }

  function renderCandidates(payload) {
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
    candidateSummaryEl.textContent = `${candidates.length} inferred candidate(s) from transaction history.`;

    if (!candidates.length) {
      emptyRow(candidatesBody, 6, 'No inferred candidates available.');
      return;
    }

    candidatesBody.innerHTML = '';

    for (const candidate of candidates) {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = candidate.profile_name;
      nameCell.title = candidate.normalized_description || '';

      const patternCell = document.createElement('td');
      patternCell.textContent = candidate.pattern_type;

      const directionCell = document.createElement('td');
      directionCell.textContent = candidate.direction;

      const amountCell = document.createElement('td');
      amountCell.className = 'numeric';
      amountCell.textContent = formatAmount(candidate.amount_estimate);

      const monthsCell = document.createElement('td');
      monthsCell.className = 'numeric';
      monthsCell.textContent = String(candidate.months_observed);

      const confidenceCell = document.createElement('td');
      confidenceCell.textContent = `${candidate.confidence_label} (${Number(candidate.confidence_score).toFixed(2)})`;

      row.appendChild(nameCell);
      row.appendChild(patternCell);
      row.appendChild(directionCell);
      row.appendChild(amountCell);
      row.appendChild(monthsCell);
      row.appendChild(confidenceCell);

      candidatesBody.appendChild(row);
    }
  }

  function renderForecast(payload) {
    const totals = payload.totals || {};
    forecastSummaryEl.textContent = `Rows: ${totals.row_count || 0}, income ${formatAmount(totals.income_total)}, expenses ${formatAmount(totals.expense_total)}, net ${formatAmount(totals.net_total)}, ending balance ${formatAmount(totals.ending_balance)}.`;

    const monthTotals = Array.isArray(payload.month_totals) ? payload.month_totals : [];
    if (!monthTotals.length) {
      emptyRow(monthTotalsBody, 5, 'No monthly totals available.');
    } else {
      monthTotalsBody.innerHTML = '';
      for (const month of monthTotals) {
        const row = document.createElement('tr');

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
      return;
    }

    forecastRowsBody.innerHTML = '';

    for (const rowData of rows) {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = rowData.date;

      const profileCell = document.createElement('td');
      profileCell.textContent = rowData.profile_name;
      profileCell.title = rowData.profile_key;

      const patternCell = document.createElement('td');
      patternCell.textContent = rowData.row_type === 'paused_profile_notice'
        ? `${rowData.pattern_type} (paused)`
        : rowData.pattern_type;

      const amountCell = document.createElement('td');
      amountCell.className = `numeric ${amountClass(rowData.amount)}`.trim();
      amountCell.textContent = formatAmount(rowData.amount);

      const balanceCell = document.createElement('td');
      balanceCell.className = 'numeric';
      balanceCell.textContent = formatAmount(rowData.running_balance);

      const sourceCell = document.createElement('td');
      sourceCell.textContent = `${rowData.source_type}: ${rowData.source_note}`;

      const confidenceCell = document.createElement('td');
      confidenceCell.textContent = `${rowData.confidence_label} (${Number(rowData.confidence_score).toFixed(2)})`;

      row.appendChild(dateCell);
      row.appendChild(profileCell);
      row.appendChild(patternCell);
      row.appendChild(amountCell);
      row.appendChild(balanceCell);
      row.appendChild(sourceCell);
      row.appendChild(confidenceCell);

      forecastRowsBody.appendChild(row);
    }
  }

  async function loadProjectionData() {
    let selection;
    try {
      selection = resolveSelection();
    } catch (err) {
      setStatus(err.message, 'status-error');
      return;
    }

    const queryBase = `account=${encodeURIComponent(selection.account)}`;
    setStatus(`Loading projection state for ${selection.account}...`);
    loadButton.disabled = true;
    refreshCandidatesButton.disabled = true;

    try {
      const [anchors, profiles, candidates, forecast] = await Promise.all([
        fetchJson(`/api/ad-hoc/projections/anchors?${queryBase}`),
        fetchJson(`/api/ad-hoc/projections/profiles?${queryBase}`),
        fetchJson(`/api/ad-hoc/projections/inferred-candidates?${queryBase}`),
        fetchJson(
          `/api/ad-hoc/projections/forecast?${queryBase}&start_month=${encodeURIComponent(
            selection.startMonth
          )}&months=${selection.months}`
        ),
      ]);

      renderAnchors(anchors);
      renderProfiles(profiles);
      renderCandidates(candidates);
      renderForecast(forecast);

      setStatus('Projection APIs loaded. Forecast rows are traceable to profile + source.', 'status-ok');
    } catch (err) {
      emptyRow(anchorsBody, 4, 'Failed to load anchors.');
      emptyRow(profilesBody, 7, 'Failed to load profiles.');
      emptyRow(candidatesBody, 6, 'Failed to load inferred candidates.');
      emptyRow(monthTotalsBody, 5, 'Failed to load forecast summary.');
      emptyRow(forecastRowsBody, 7, 'Failed to load forecast rows.');
      setStatus(err.message, 'status-error');
    } finally {
      loadButton.disabled = false;
      refreshCandidatesButton.disabled = false;
    }
  }

  async function refreshCandidates() {
    let selection;
    try {
      selection = resolveSelection();
    } catch (err) {
      setStatus(err.message, 'status-error');
      return;
    }

    setStatus(`Refreshing inferred candidates for ${selection.account}...`);
    refreshCandidatesButton.disabled = true;

    try {
      await fetchJson(
        `/api/ad-hoc/projections/inferred-candidates/refresh?account=${encodeURIComponent(
          selection.account
        )}`,
        {
          method: 'POST',
        }
      );
      await loadProjectionData();
    } catch (err) {
      setStatus(err.message, 'status-error');
    } finally {
      refreshCandidatesButton.disabled = false;
    }
  }

  loadButton.addEventListener('click', loadProjectionData);
  refreshCandidatesButton.addEventListener('click', refreshCandidates);

  emptyRow(anchorsBody, 4, 'Loading anchors...');
  emptyRow(profilesBody, 7, 'Loading profiles...');
  emptyRow(candidatesBody, 6, 'Loading inferred candidates...');
  emptyRow(monthTotalsBody, 5, 'Loading forecast summary...');
  emptyRow(forecastRowsBody, 7, 'Loading forecast rows...');

  loadProjectionData();
})();
