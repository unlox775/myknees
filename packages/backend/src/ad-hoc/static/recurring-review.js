(function () {
  const DEFAULT_ACCOUNTS = 'Ally_Bank,Capital_One,Chase_VISA';

  const moneyFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const statusEl = document.getElementById('recurring-status');
  const cutoffNoteEl = document.getElementById('recurring-cutoff-note');
  const accountsInput = document.getElementById('recurring-accounts-input');
  const sortSelect = document.getElementById('recurring-sort-select');
  const labelFilterSelect = document.getElementById('recurring-label-filter-select');
  const loadButton = document.getElementById('recurring-load-button');

  const savingsGridEl = document.getElementById('recurring-savings-grid');
  const summaryEl = document.getElementById('recurring-table-summary');
  const candidatesBody = document.getElementById('recurring-candidates-body');

  const state = {
    candidates: [],
    candidateById: new Map(),
    keepById: new Map(),
    detailById: new Map(),
    detailAccountToken: DEFAULT_ACCOUNTS,
  };

  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className = `status ${type || ''}`.trim();
  }

  function formatAmount(value) {
    return moneyFormat.format(Number(value) || 0);
  }

  function amountClass(value) {
    const amount = Number(value);
    if (amount > 0) return 'amount-positive';
    if (amount < 0) return 'amount-negative';
    return '';
  }

  function renderEmptyRow(colCount, message) {
    candidatesBody.innerHTML = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colCount;
    cell.className = 'empty-cell';
    cell.textContent = message;
    row.appendChild(cell);
    candidatesBody.appendChild(row);
  }

  function fetchJson(url, options) {
    return fetch(url, options).then(async (response) => {
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
    });
  }

  function resolveSelection() {
    const accountToken = String(accountsInput.value || '').trim() || DEFAULT_ACCOUNTS;
    if (accountToken.toLowerCase() !== 'all') {
      const accounts = accountToken
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      if (!accounts.length) {
        throw new Error('Provide at least one account identifier, comma-separated, or use "all".');
      }
    }

    const sort = String(sortSelect.value || 'confidence_desc');
    const label = String(labelFilterSelect.value || 'all');

    return {
      accountToken,
      sort,
      label,
    };
  }

  function candidateIsKept(candidateId) {
    return state.keepById.get(candidateId) !== false;
  }

  function updateSavingsGrid() {
    let keptMonthly = 0;
    let keptAnnual = 0;
    let savingsMonthly = 0;
    let savingsAnnual = 0;
    let uncheckedCount = 0;

    for (const candidate of state.candidates) {
      const monthly = Number(candidate.amount.monthly_equivalent) || 0;
      const annual = Number(candidate.amount.annual_equivalent) || 0;
      if (candidateIsKept(candidate.candidate_id)) {
        keptMonthly += monthly;
        keptAnnual += annual;
      } else {
        savingsMonthly += monthly;
        savingsAnnual += annual;
        uncheckedCount += 1;
      }
    }

    const lines = [
      `<p><strong>Kept recurring monthly equivalent:</strong> ${formatAmount(keptMonthly)}</p>`,
      `<p><strong>Potential savings if unchecked items are canceled:</strong> ${formatAmount(savingsMonthly)} monthly / ${formatAmount(savingsAnnual)} annual</p>`,
      `<p><strong>Unchecked candidates:</strong> ${uncheckedCount} of ${state.candidates.length}</p>`,
      '<p class="answer-neutral">Savings totals are hypothetical and should be validated against essentiality labels before acting.</p>',
    ];

    savingsGridEl.innerHTML = lines.join('');
  }

  function labelClass(label) {
    const map = {
      essential: 'badge-essential',
      discretionary: 'badge-discretionary',
      unknown: 'badge-unknown',
      subscription: 'badge-subscription',
      monthly: 'badge-cadence',
      'every-other-month': 'badge-cadence',
      annual: 'badge-cadence',
      'low-confidence': 'badge-low',
    };

    const cls = map[label] || 'badge-unknown';
    return `badge ${cls}`;
  }

  function createSparkline(history) {
    const wrap = document.createElement('div');
    wrap.className = 'sparkline-wrap';

    const chart = document.createElement('div');
    chart.className = 'sparkline';

    const rows = Array.isArray(history) ? history : [];
    const maxAmount = rows.reduce((max, row) => {
      const value = Number(row.total_amount) || 0;
      return value > max ? value : max;
    }, 0);

    for (const row of rows) {
      const value = Number(row.total_amount) || 0;
      const bar = document.createElement('span');
      bar.className = 'sparkline-bar';
      if (value <= 0) {
        bar.classList.add('is-empty');
      }

      const pct = maxAmount > 0 ? Math.round((value / maxAmount) * 100) : 0;
      bar.style.height = `${Math.max(6, pct)}%`;
      bar.title = `${row.month_key}: ${formatAmount(value)} (${row.transaction_count} tx)`;
      chart.appendChild(bar);
    }

    wrap.appendChild(chart);
    return wrap;
  }

  function buildLabelCell(candidate) {
    const cell = document.createElement('td');

    for (const label of candidate.label_set || []) {
      const badge = document.createElement('span');
      badge.className = labelClass(label);
      badge.textContent = label;
      cell.appendChild(badge);
    }

    return cell;
  }

  function createCandidateRow(candidate) {
    const row = document.createElement('tr');
    row.className = 'recurring-candidate-row';
    row.dataset.candidateId = candidate.candidate_id;

    const keepCell = document.createElement('td');
    keepCell.className = 'numeric';
    const keepToggle = document.createElement('input');
    keepToggle.type = 'checkbox';
    keepToggle.className = 'recurring-keep-toggle';
    keepToggle.dataset.candidateId = candidate.candidate_id;
    keepToggle.checked = candidateIsKept(candidate.candidate_id);
    keepCell.appendChild(keepToggle);

    const nameCell = document.createElement('td');
    const name = document.createElement('div');
    name.className = 'recurring-name';
    name.textContent = candidate.display_name;
    const sub = document.createElement('div');
    sub.className = 'recurring-subtext';
    sub.textContent = `${candidate.occurrence_count} tx across ${candidate.months_observed} active months`;
    nameCell.appendChild(name);
    nameCell.appendChild(sub);

    const labelsCell = buildLabelCell(candidate);

    const cadenceCell = document.createElement('td');
    cadenceCell.innerHTML = `<div>${candidate.cadence.label} (${candidate.cadence.cadence_interval_months}m)</div><div class="recurring-subtext">${candidate.confidence.label} confidence (${Number(candidate.confidence.score).toFixed(2)})</div>`;

    const lastSeenCell = document.createElement('td');
    lastSeenCell.textContent = candidate.last_seen_date;

    const monthlyCell = document.createElement('td');
    monthlyCell.className = `numeric ${amountClass(candidate.amount.monthly_equivalent)}`.trim();
    monthlyCell.textContent = formatAmount(candidate.amount.monthly_equivalent);

    const annualCell = document.createElement('td');
    annualCell.className = `numeric ${amountClass(candidate.amount.annual_equivalent)}`.trim();
    annualCell.textContent = formatAmount(candidate.amount.annual_equivalent);

    const historyCell = document.createElement('td');
    historyCell.appendChild(createSparkline(candidate.history));

    const detailCell = document.createElement('td');
    const detailButton = document.createElement('button');
    detailButton.type = 'button';
    detailButton.className = 'detail-toggle-button';
    detailButton.dataset.candidateId = candidate.candidate_id;
    detailButton.textContent = 'Show detail';
    detailCell.appendChild(detailButton);

    row.appendChild(keepCell);
    row.appendChild(nameCell);
    row.appendChild(labelsCell);
    row.appendChild(cadenceCell);
    row.appendChild(lastSeenCell);
    row.appendChild(monthlyCell);
    row.appendChild(annualCell);
    row.appendChild(historyCell);
    row.appendChild(detailCell);

    const detailRow = document.createElement('tr');
    detailRow.className = 'recurring-detail-row is-hidden';
    detailRow.dataset.candidateId = candidate.candidate_id;

    const detailWrapCell = document.createElement('td');
    detailWrapCell.colSpan = 9;

    const detailWrap = document.createElement('div');
    detailWrap.className = 'detail-wrap';
    detailWrap.textContent = 'Click "Show detail" to load underlying transactions.';

    detailWrapCell.appendChild(detailWrap);
    detailRow.appendChild(detailWrapCell);

    return { row, detailRow };
  }

  function renderDetailTable(payload, containerEl) {
    const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];

    const summary = document.createElement('p');
    summary.className = 'fine-print';
    summary.textContent = `${payload.candidate.display_name}: ${transactions.length} transaction(s), monthly equivalent ${formatAmount(
      payload.candidate.amount.monthly_equivalent
    )}, annual equivalent ${formatAmount(payload.candidate.amount.annual_equivalent)}.`;

    containerEl.innerHTML = '';
    containerEl.appendChild(summary);

    if (!transactions.length) {
      const none = document.createElement('p');
      none.className = 'fine-print';
      none.textContent = 'No underlying transactions found.';
      containerEl.appendChild(none);
      return;
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';

    const table = document.createElement('table');
    table.setAttribute('aria-label', 'Recurring candidate transaction details');

    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Account</th>
          <th scope="col" class="numeric">Amount</th>
          <th scope="col">Category</th>
          <th scope="col">Raw / Normalized Description</th>
          <th scope="col" class="numeric">Tx ID</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    for (const tx of transactions) {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = tx.date;

      const accountCell = document.createElement('td');
      accountCell.textContent = tx.account_name || tx.account_identifier || '';
      accountCell.title = tx.account_identifier || '';

      const amountCell = document.createElement('td');
      amountCell.className = `numeric ${amountClass(tx.amount)}`.trim();
      amountCell.textContent = formatAmount(tx.amount);

      const categoryCell = document.createElement('td');
      categoryCell.textContent = tx.category || '';

      const descCell = document.createElement('td');
      descCell.className = 'normalized-cell';
      const raw = tx.raw_description || '';
      const normalized = tx.normalized_description || '';
      descCell.textContent = `${raw} -> ${normalized}`;

      const idCell = document.createElement('td');
      idCell.className = 'numeric';
      idCell.textContent = String(tx.transaction_id);

      row.appendChild(dateCell);
      row.appendChild(accountCell);
      row.appendChild(amountCell);
      row.appendChild(categoryCell);
      row.appendChild(descCell);
      row.appendChild(idCell);

      tbody.appendChild(row);
    }

    tableWrap.appendChild(table);
    containerEl.appendChild(tableWrap);
  }

  async function loadDetail(candidateId, detailRow, buttonEl) {
    const candidate = state.candidateById.get(candidateId);
    if (!candidate) return;

    const detailWrap = detailRow.querySelector('.detail-wrap');

    detailRow.classList.remove('is-hidden');
    buttonEl.textContent = 'Hide detail';

    if (state.detailById.has(candidateId)) {
      renderDetailTable(state.detailById.get(candidateId), detailWrap);
      return;
    }

    detailWrap.textContent = 'Loading detail...';

    try {
      const params = new URLSearchParams();
      params.set('accounts', state.detailAccountToken || DEFAULT_ACCOUNTS);
      const payload = await fetchJson(`${candidate.detail_path}?${params.toString()}`);
      state.detailById.set(candidateId, payload);
      renderDetailTable(payload, detailWrap);
    } catch (err) {
      detailWrap.textContent = `Failed to load detail: ${err.message}`;
    }
  }

  function collapseDetail(detailRow, buttonEl) {
    detailRow.classList.add('is-hidden');
    buttonEl.textContent = 'Show detail';
  }

  function renderCutoffNote(payload) {
    const windowInfo = payload.canonical_window || {};
    const reason = windowInfo.history_limited && windowInfo.history_limit_reason
      ? ` ${windowInfo.history_limit_reason}`
      : '';

    cutoffNoteEl.textContent = `Canonical cutoff: ${windowInfo.canonical_cutoff}. Window: ${windowInfo.start_month} to ${windowInfo.end_month} (${windowInfo.month_count} months).${reason}`;
  }

  function renderCandidates(payload) {
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
    state.candidates = candidates;
    state.candidateById = new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));
    state.detailById = new Map();

    for (const candidate of candidates) {
      if (!state.keepById.has(candidate.candidate_id)) {
        state.keepById.set(candidate.candidate_id, true);
      }
    }

    const totals = payload.totals || {};
    summaryEl.textContent = `${totals.candidate_count || 0} candidate(s), ${formatAmount(
      totals.monthly_equivalent_total
    )} monthly equivalent, ${formatAmount(totals.annual_equivalent_total)} annual equivalent.`;

    if (!candidates.length) {
      renderEmptyRow(9, 'No recurring candidates matched this filter set.');
      updateSavingsGrid();
      return;
    }

    candidatesBody.innerHTML = '';

    for (const candidate of candidates) {
      const { row, detailRow } = createCandidateRow(candidate);
      candidatesBody.appendChild(row);
      candidatesBody.appendChild(detailRow);
    }

    updateSavingsGrid();
  }

  async function loadRecurringReview() {
    let selection;
    try {
      selection = resolveSelection();
    } catch (err) {
      setStatus(err.message, 'status-error');
      return;
    }

    state.detailAccountToken = selection.accountToken;

    const params = new URLSearchParams();
    params.set('accounts', selection.accountToken);
    params.set('sort', selection.sort);
    if (selection.label && selection.label !== 'all') {
      params.set('label', selection.label);
    }

    setStatus('Loading recurring candidates and history evidence...');
    loadButton.disabled = true;

    try {
      const payload = await fetchJson(`/api/ad-hoc/recurring-review/candidates?${params.toString()}`);
      renderCutoffNote(payload);
      renderCandidates(payload);
      setStatus('Recurring review loaded. Uncheck rows to model hypothetical cancellation savings.', 'status-ok');
    } catch (err) {
      cutoffNoteEl.textContent = '';
      summaryEl.textContent = '';
      renderEmptyRow(9, 'Failed to load recurring candidates.');
      setStatus(err.message, 'status-error');
    } finally {
      loadButton.disabled = false;
    }
  }

  candidatesBody.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.classList.contains('recurring-keep-toggle')) return;

    const candidateId = target.dataset.candidateId;
    if (!candidateId) return;

    state.keepById.set(candidateId, target.checked);
    updateSavingsGrid();
  });

  candidatesBody.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest('.detail-toggle-button');
    if (!(button instanceof HTMLButtonElement)) return;

    const candidateId = button.dataset.candidateId;
    if (!candidateId) return;

    const detailRow = candidatesBody.querySelector(
      `.recurring-detail-row[data-candidate-id="${candidateId}"]`
    );
    if (!(detailRow instanceof HTMLTableRowElement)) return;

    const isHidden = detailRow.classList.contains('is-hidden');
    if (!isHidden) {
      collapseDetail(detailRow, button);
      return;
    }

    await loadDetail(candidateId, detailRow, button);
  });

  loadButton.addEventListener('click', loadRecurringReview);

  renderEmptyRow(9, 'Loading recurring candidates...');
  updateSavingsGrid();
  loadRecurringReview();
})();
