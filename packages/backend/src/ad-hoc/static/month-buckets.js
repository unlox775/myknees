(function () {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const moneyFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const yearInput = document.getElementById('year-input');
  const monthSelect = document.getElementById('month-select');
  const loadButton = document.getElementById('load-month-button');
  const statusEl = document.getElementById('month-status');

  const summaryTotalsEl = document.getElementById('summary-totals');
  const summaryBody = document.getElementById('summary-table-body');

  const detailSelectedEl = document.getElementById('detail-selected-bucket');
  const detailBody = document.getElementById('detail-table-body');
  const categoryEditor = window.MykneesTransactionCategoryEditor;

  const storageKey = 'myknees.ad_hoc.month_buckets_state.v1';
  let currentWindow = null;
  let currentDetailBucket = null;
  let currentDetailRows = [];
  let categoryOptions = [];

  function loadSavedState() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (_err) {
      return {};
    }
  }

  function saveState(patch) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        ...loadSavedState(),
        ...patch,
      }));
    } catch (_err) {
      // Local storage is a convenience only; the page should keep working without it.
    }
  }

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

  function renderEmptyRow(bodyEl, colCount, text) {
    bodyEl.innerHTML = '';

    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colCount;
    cell.className = 'empty-cell';
    cell.textContent = text;

    row.appendChild(cell);
    bodyEl.appendChild(row);
  }

  function buildMonthOptions() {
    monthSelect.innerHTML = '';

    for (let index = 0; index < monthNames.length; index += 1) {
      const option = document.createElement('option');
      option.value = String(index + 1);
      option.textContent = monthNames[index];
      monthSelect.appendChild(option);
    }
  }

  function setCurrentMonthDefaults() {
    const query = new URLSearchParams(window.location.search || '');
    const rawYear = query.get('year');
    const rawMonth = query.get('month');

    const saved = loadSavedState();
    const now = new Date();
    let year = Number.isInteger(saved.year) ? saved.year : now.getFullYear();
    let month = Number.isInteger(saved.month) ? saved.month : now.getMonth() + 1;

    const parsedYear = parseInt(rawYear, 10);
    if (Number.isInteger(parsedYear) && parsedYear >= 1970 && parsedYear <= 3000) {
      year = parsedYear;
    }

    const parsedMonth = parseInt(rawMonth, 10);
    if (Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
      month = parsedMonth;
    }

    yearInput.value = String(year);
    monthSelect.value = String(month);
  }

  function getSelection() {
    const year = parseInt(yearInput.value, 10);
    const month = parseInt(monthSelect.value, 10);

    if (!Number.isInteger(year) || year < 1970 || year > 3000) {
      throw new Error('Year must be between 1970 and 3000.');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12.');
    }

    return { year, month };
  }

  function formatMonthYear(windowInfo) {
    const name = monthNames[(windowInfo.month || 1) - 1] || `Month ${windowInfo.month}`;
    return `${name} ${windowInfo.year}`;
  }

  function formatAmount(value) {
    return moneyFormat.format(Number(value) || 0);
  }

  function clearDetails() {
    currentDetailBucket = null;
    currentDetailRows = [];
    detailSelectedEl.textContent = 'No bucket selected.';
    renderEmptyRow(detailBody, 7, 'Select a bucket in the summary table.');
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();

    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch (_err) {
        throw new Error(`Unexpected response body (${response.status}).`);
      }
    }

    if (!response.ok) {
      const message = parsed && parsed.error ? parsed.error : `Request failed (${response.status}).`;
      throw new Error(message);
    }

    return parsed;
  }

  function renderSummary(payload, options = {}) {
    const buckets = Array.isArray(payload.buckets) ? payload.buckets : [];
    currentWindow = payload.window;

    summaryTotalsEl.textContent = `${formatMonthYear(payload.window)}: ${payload.totals.transaction_count} transactions across ${payload.totals.bucket_count} buckets (net ${formatAmount(payload.totals.total_amount)}).`;

    if (!buckets.length) {
      renderEmptyRow(summaryBody, 3, 'No transactions found in this month.');
      if (!options.preserveDetails) clearDetails();
      return;
    }

    summaryBody.innerHTML = '';

    for (const bucket of buckets) {
      const row = document.createElement('tr');
      row.className = 'bucket-row';

      const bucketCell = document.createElement('td');
      const bucketButton = document.createElement('button');
      bucketButton.type = 'button';
      bucketButton.className = 'bucket-button';
      bucketButton.textContent = bucket.bucket;
      bucketButton.addEventListener('click', () => {
        loadBucketDetail(bucket.bucket);
      });
      bucketCell.appendChild(bucketButton);

      const countCell = document.createElement('td');
      countCell.className = 'numeric';
      countCell.textContent = String(bucket.transaction_count);

      const amountCell = document.createElement('td');
      amountCell.className = `numeric ${amountClass(bucket.total_amount)}`.trim();
      amountCell.textContent = formatAmount(bucket.total_amount);

      row.appendChild(bucketCell);
      row.appendChild(countCell);
      row.appendChild(amountCell);

      row.addEventListener('click', (event) => {
        if (event.target && event.target.closest('button')) return;
        loadBucketDetail(bucket.bucket);
      });

      summaryBody.appendChild(row);
    }

    if (!options.preserveDetails) clearDetails();
  }

  function buildCategoryEditor(rowData) {
    return categoryEditor.buildCategoryEditor({
      rowData,
      categoryOptions,
      ariaLabel: `Override bucket for transaction ${rowData.transaction_id}`,
      onChange: (selectEl) => {
        saveCategoryOverride(rowData, selectEl);
      },
      onGeneralRuleChange: (selectEl, checkboxEl) => {
        saveCategoryOverride(rowData, selectEl, {
          applyAsRule: checkboxEl.checked,
          removeGeneralRule: !checkboxEl.checked,
        });
      },
    });
  }

  function rowMovedOutOfCurrentView(rowData) {
    return currentDetailBucket && (rowData.effective_category || rowData.bucket) !== currentDetailBucket;
  }

  function renderDetail(payload) {
    const rows = Array.isArray(payload.transactions) ? payload.transactions : currentDetailRows;
    if (Array.isArray(payload.category_options)) categoryOptions = payload.category_options;
    currentDetailBucket = payload.bucket || currentDetailBucket;
    currentDetailRows = rows;

    detailSelectedEl.textContent = `${payload.bucket}: ${payload.transaction_count} transactions (net ${formatAmount(payload.total_amount)}).`;

    if (!rows.length) {
      renderEmptyRow(detailBody, 7, 'No transactions found for this bucket in the selected month.');
      return;
    }

    detailBody.innerHTML = '';

    for (const rowData of rows) {
      const row = document.createElement('tr');
      row.className = rowMovedOutOfCurrentView(rowData) ? 'transaction-moved-row' : '';
      if (rowMovedOutOfCurrentView(rowData)) {
        row.title = 'This saved edit moved the transaction out of the currently loaded detail view. Reload or navigate back to hide it.';
      }

      const dateCell = document.createElement('td');
      dateCell.textContent = rowData.date;

      const accountCell = document.createElement('td');
      accountCell.textContent = rowData.account_name || rowData.account_identifier || '';
      accountCell.title = rowData.account_identifier || '';

      const amountCell = document.createElement('td');
      amountCell.className = `numeric ${amountClass(rowData.amount)}`.trim();
      amountCell.textContent = formatAmount(rowData.amount);

      const normalizedCell = categoryEditor.buildNormalizedDescriptionCell(rowData, {
        onEditNotes: saveTransactionNotes,
      });

      const defaultCategoryCell = document.createElement('td');
      defaultCategoryCell.textContent = categoryEditor.defaultRuleCategory(rowData);

      const overrideCell = document.createElement('td');
      overrideCell.appendChild(buildCategoryEditor(rowData));

      const idCell = document.createElement('td');
      idCell.className = 'numeric';
      idCell.textContent = String(rowData.transaction_id);

      row.appendChild(dateCell);
      row.appendChild(accountCell);
      row.appendChild(amountCell);
      row.appendChild(normalizedCell);
      row.appendChild(defaultCategoryCell);
      row.appendChild(overrideCell);
      row.appendChild(idCell);

      detailBody.appendChild(row);
    }
  }

  async function refreshMonthSummaryPreservingDetail() {
    if (!currentWindow) return;
    const payload = await fetchJson(`/api/ad-hoc/month-buckets?year=${currentWindow.year}&month=${currentWindow.month}`);
    renderSummary(payload, { preserveDetails: true });
  }

  async function saveTransactionNotes(rowData) {
    setStatus(`Saving note for transaction ${rowData.transaction_id}...`);
    try {
      await categoryEditor.saveTransactionNotes(rowData, {
        onSaved: (updated) => {
          categoryEditor.mergeUpdatedTransaction(currentDetailRows, updated);
        },
      });
      renderDetail({
        bucket: currentDetailBucket,
        transaction_count: currentDetailRows.length,
        total_amount: categoryEditor.sumAmounts(currentDetailRows),
        transactions: currentDetailRows,
        category_options: categoryOptions,
      });
      setStatus('Transaction note saved.', 'status-ok');
    } catch (err) {
      setStatus(err.message, 'status-error');
    }
  }

  async function saveCategoryOverride(rowData, selectEl, options = {}) {
    const previousValue = categoryEditor.currentCategoryValue(rowData);
    selectEl.disabled = true;
    const savingRule = options.applyAsRule || options.removeGeneralRule;
    setStatus(
      savingRule
        ? `Saving general rule for transaction ${rowData.transaction_id}...`
        : `Saving category for transaction ${rowData.transaction_id}...`
    );

    try {
      const payload = await fetchJson(
        `/api/ad-hoc/transactions/${encodeURIComponent(rowData.transaction_id)}/category-override`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryEditor.buildOverridePayload(selectEl, options)),
        }
      );

      if (Array.isArray(payload.category_options)) categoryOptions = payload.category_options;
      categoryEditor.mergeUpdatedTransaction(currentDetailRows, payload.transaction);

      await refreshMonthSummaryPreservingDetail();
      renderDetail({
        bucket: currentDetailBucket,
        transaction_count: currentDetailRows.length,
        total_amount: categoryEditor.sumAmounts(currentDetailRows),
        transactions: currentDetailRows,
        category_options: categoryOptions,
      });
      const ruleCount = payload.rule_result && Number.isFinite(Number(payload.rule_result.matching_transaction_count))
        ? Number(payload.rule_result.matching_transaction_count)
        : null;
      setStatus(
        ruleCount == null
          ? 'Category saved. Summary totals refreshed; striped rows have moved out of this detail view.'
          : `General rule saved. ${ruleCount} matching non-manual transactions refreshed.`,
        'status-ok'
      );
    } catch (err) {
      selectEl.value = previousValue;
      setStatus(err.message, 'status-error');
    } finally {
      selectEl.disabled = false;
    }
  }

  async function loadMonthSummary() {
    let selection;
    try {
      selection = getSelection();
    } catch (err) {
      setStatus(err.message, 'status-error');
      return;
    }

    setStatus(`Loading ${monthNames[selection.month - 1]} ${selection.year}...`);
    loadButton.disabled = true;

    try {
      const payload = await fetchJson(`/api/ad-hoc/month-buckets?year=${selection.year}&month=${selection.month}`);
      renderSummary(payload);
      saveState({
        year: selection.year,
        month: selection.month,
      });
      setStatus(`${formatMonthYear(payload.window)} loaded. Click a bucket to inspect details.`, 'status-ok');

      const savedBucket = loadSavedState().bucket;
      const hasSavedBucket = Array.isArray(payload.buckets) && payload.buckets.some((row) => row.bucket === savedBucket);
      if (hasSavedBucket) {
        loadBucketDetail(savedBucket);
      }
    } catch (err) {
      renderEmptyRow(summaryBody, 3, 'Failed to load summary data.');
      clearDetails();
      setStatus(err.message, 'status-error');
    } finally {
      loadButton.disabled = false;
    }
  }

  async function loadBucketDetail(bucketName) {
    if (!currentWindow) {
      detailSelectedEl.textContent = 'Load a month first.';
      return;
    }

    detailSelectedEl.textContent = `Loading ${bucketName}...`;
    renderEmptyRow(detailBody, 7, 'Loading bucket detail...');

    try {
      const encodedBucket = encodeURIComponent(bucketName);
      const url = `/api/ad-hoc/month-buckets/${encodedBucket}/transactions?year=${currentWindow.year}&month=${currentWindow.month}`;
      const payload = await fetchJson(url);
      renderDetail(payload);
      saveState({ bucket: bucketName });
    } catch (err) {
      detailSelectedEl.textContent = `Failed to load ${bucketName}.`;
      renderEmptyRow(detailBody, 7, err.message);
    }
  }

  loadButton.addEventListener('click', loadMonthSummary);

  buildMonthOptions();
  if (!categoryEditor) {
    renderEmptyRow(summaryBody, 3, 'Category editor helper failed to load.');
    renderEmptyRow(detailBody, 7, 'Category editor helper failed to load.');
    setStatus('Category editor helper failed to load. Refresh this page.', 'status-error');
    return;
  }
  setCurrentMonthDefaults();
  renderEmptyRow(summaryBody, 3, 'Loading current month...');
  clearDetails();
  loadMonthSummary();
})();
