(function () {
  const moneyFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const presetSelect = document.getElementById('trend-preset-select');
  const startMonthSelect = document.getElementById('trend-start-month');
  const endMonthSelect = document.getElementById('trend-end-month');
  const categorySelect = document.getElementById('trend-category-select');
  const loadButton = document.getElementById('load-category-trend-button');

  const statusEl = document.getElementById('trend-status');
  const cutoffNoteEl = document.getElementById('trend-cutoff-note');

  const trendSummaryEl = document.getElementById('trend-summary');
  const trendTableBody = document.getElementById('trend-month-table-body');

  const detailSelectedEl = document.getElementById('trend-detail-selected');
  const detailTableBody = document.getElementById('trend-detail-table-body');
  const pivotLinkEl = document.getElementById('trend-pivot-link');

  let currentRange = null;
  let availableMonths = [];

  function formatAmount(value) {
    return moneyFormat.format(Number(value) || 0);
  }

  function amountClass(value) {
    const n = Number(value);
    if (n < 0) return 'amount-negative';
    if (n > 0) return 'amount-positive';
    return '';
  }

  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className = `status ${type || ''}`.trim();
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

  async function fetchJson(url) {
    const response = await fetch(url);
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

  function syncRangeControlsEnabledState() {
    const isCustom = presetSelect.value === 'custom';
    startMonthSelect.disabled = !isCustom;
    endMonthSelect.disabled = !isCustom;
  }

  function populateMonthSelect(selectEl, months, selectedMonthKey) {
    selectEl.innerHTML = '';
    for (const month of months) {
      const option = document.createElement('option');
      option.value = month.month_key;
      option.textContent = month.is_incomplete_month
        ? `${month.month_label} (partial)`
        : month.month_label;
      selectEl.appendChild(option);
    }

    if (!months.length) return;
    const target = months.some((month) => month.month_key === selectedMonthKey)
      ? selectedMonthKey
      : months[0].month_key;
    selectEl.value = target;
  }

  function populateCategorySelect(categories, preferredCategoryKey) {
    categorySelect.innerHTML = '';

    for (const category of categories) {
      const option = document.createElement('option');
      option.value = category.category_key;
      option.textContent = `${category.category_label} (${category.transaction_count} tx, ${formatAmount(category.total_amount)})`;
      categorySelect.appendChild(option);
    }

    if (!categories.length) return null;

    const requested = String(preferredCategoryKey || '');
    const selected = categories.some((row) => row.category_key === requested)
      ? requested
      : categories[0].category_key;
    categorySelect.value = selected;
    return selected;
  }

  function buildCatalogQueryFromControls() {
    const preset = presetSelect.value || 'last_12_months';
    const params = new URLSearchParams();

    if (preset === 'custom') {
      if (startMonthSelect.value) params.set('start_month', startMonthSelect.value);
      if (endMonthSelect.value) params.set('end_month', endMonthSelect.value);
    } else {
      params.set('preset', preset);
    }

    return params;
  }

  function monthLabelByKey(monthKey) {
    const match = availableMonths.find((month) => month.month_key === monthKey);
    return match ? match.month_label : monthKey;
  }

  function updateCutoffNote(canonicalCutoff, range) {
    if (!canonicalCutoff || !canonicalCutoff.has_data) {
      cutoffNoteEl.textContent = 'No transaction history is available yet.';
      return;
    }

    const incompletenessNote = canonicalCutoff.latest_month_incomplete
      ? `Latest month ${canonicalCutoff.latest_month} is partial through ${canonicalCutoff.latest_transaction_date}.`
      : `Latest month ${canonicalCutoff.latest_month} is complete through ${canonicalCutoff.latest_transaction_date}.`;

    cutoffNoteEl.textContent =
      `Canonical cutoff: ${canonicalCutoff.rule}. Showing ${range.start_month} to ${range.end_month}. ${incompletenessNote}`;
  }

  function clearDetail() {
    detailSelectedEl.textContent = 'No month selected.';
    pivotLinkEl.href = '/ad-hoc/month-buckets';
    renderEmptyRow(detailTableBody, 5, 'Select a month in the trend table.');
  }

  function renderTrend(payload) {
    currentRange = payload.range;

    const rows = Array.isArray(payload.months) ? payload.months : [];
    const categoryLabel = payload.category && payload.category.category_label
      ? payload.category.category_label
      : 'Category';

    trendSummaryEl.textContent =
      `${categoryLabel}: ${payload.totals.transaction_count} transactions across ${payload.totals.month_count} months (${payload.totals.months_with_activity} active), net ${formatAmount(payload.totals.total_amount)}.`;

    if (!rows.length) {
      renderEmptyRow(trendTableBody, 4, 'No months available in the selected range.');
      clearDetail();
      return;
    }

    const maxAbsolute = Number(payload.totals.max_absolute_month_total) || 0;
    trendTableBody.innerHTML = '';

    for (const month of rows) {
      const row = document.createElement('tr');
      row.className = 'trend-month-row';

      const monthCell = document.createElement('td');
      const monthButton = document.createElement('button');
      monthButton.type = 'button';
      monthButton.className = 'bucket-button';
      monthButton.textContent = month.is_incomplete_month
        ? `${month.month_label} (partial)`
        : month.month_label;
      monthButton.addEventListener('click', () => {
        loadMonthDetail(month);
      });
      monthCell.appendChild(monthButton);

      const countCell = document.createElement('td');
      countCell.className = 'numeric';
      countCell.textContent = String(month.transaction_count);

      const amountCell = document.createElement('td');
      amountCell.className = `numeric ${amountClass(month.total_amount)}`.trim();
      amountCell.textContent = formatAmount(month.total_amount);

      const barCell = document.createElement('td');
      const barWrap = document.createElement('div');
      barWrap.className = 'trend-bar-wrap';
      const bar = document.createElement('div');
      bar.className = `trend-bar ${amountClass(month.total_amount)}`.trim();
      bar.style.width =
        maxAbsolute > 0
          ? `${Math.max(2, Math.round((Math.abs(Number(month.total_amount) || 0) / maxAbsolute) * 100))}%`
          : '0%';
      barWrap.appendChild(bar);
      barCell.appendChild(barWrap);

      row.appendChild(monthCell);
      row.appendChild(countCell);
      row.appendChild(amountCell);
      row.appendChild(barCell);

      row.addEventListener('click', (event) => {
        if (event.target && event.target.closest('button')) return;
        loadMonthDetail(month);
      });

      trendTableBody.appendChild(row);
    }

    clearDetail();
  }

  function renderDetail(payload) {
    const rows = Array.isArray(payload.transactions) ? payload.transactions : [];
    const monthLabel = payload.window && payload.window.month_label
      ? payload.window.month_label
      : monthLabelByKey(payload.window ? payload.window.month_key : '');
    const categoryLabel = payload.category && payload.category.category_label
      ? payload.category.category_label
      : 'Category';

    const monthSuffix = payload.window && payload.window.is_incomplete_month ? ' (partial)' : '';
    detailSelectedEl.textContent =
      `${categoryLabel} - ${monthLabel}${monthSuffix}: ${payload.transaction_count} transactions (net ${formatAmount(payload.total_amount)}).`;

    if (payload.month_bucket_browser_path) {
      pivotLinkEl.href = payload.month_bucket_browser_path;
    }

    if (!rows.length) {
      renderEmptyRow(detailTableBody, 5, 'No transactions found for this category in the selected month.');
      return;
    }

    detailTableBody.innerHTML = '';

    for (const rowData of rows) {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = rowData.date || '';

      const accountCell = document.createElement('td');
      accountCell.textContent = rowData.account_name || rowData.account_identifier || '';
      accountCell.title = rowData.account_identifier || '';

      const amountCell = document.createElement('td');
      amountCell.className = `numeric ${amountClass(rowData.amount)}`.trim();
      amountCell.textContent = formatAmount(rowData.amount);

      const normalizedCell = document.createElement('td');
      normalizedCell.className = 'normalized-cell';
      normalizedCell.textContent = rowData.normalized_description || '';
      normalizedCell.title = rowData.raw_description || '';

      const idCell = document.createElement('td');
      idCell.className = 'numeric';
      idCell.textContent = String(rowData.transaction_id || '');

      row.appendChild(dateCell);
      row.appendChild(accountCell);
      row.appendChild(amountCell);
      row.appendChild(normalizedCell);
      row.appendChild(idCell);

      detailTableBody.appendChild(row);
    }
  }

  async function loadMonthDetail(monthRow) {
    detailSelectedEl.textContent = `Loading ${monthRow.month_label} detail...`;
    renderEmptyRow(detailTableBody, 5, 'Loading detail rows...');

    try {
      const payload = await fetchJson(monthRow.detail_path);
      renderDetail(payload);
    } catch (err) {
      detailSelectedEl.textContent = `Failed to load ${monthRow.month_label} detail.`;
      renderEmptyRow(detailTableBody, 5, err.message);
    }
  }

  async function loadTrendForSelectedCategory() {
    const categoryKey = categorySelect.value;
    if (!categoryKey) {
      renderEmptyRow(trendTableBody, 4, 'No category selected.');
      clearDetail();
      return;
    }

    if (!currentRange || !currentRange.start_month || !currentRange.end_month) {
      renderEmptyRow(trendTableBody, 4, 'No range selected.');
      clearDetail();
      return;
    }

    const params = new URLSearchParams();
    params.set('category', categoryKey);
    params.set('start_month', currentRange.start_month);
    params.set('end_month', currentRange.end_month);

    setStatus(`Loading trend for ${categoryKey}...`);
    loadButton.disabled = true;
    categorySelect.disabled = true;

    try {
      const payload = await fetchJson(`/api/ad-hoc/category-trends?${params.toString()}`);
      renderTrend(payload);
      setStatus(
        `Loaded ${payload.category.category_label} for ${monthLabelByKey(payload.range.start_month)} through ${monthLabelByKey(payload.range.end_month)}.`,
        'status-ok'
      );
    } catch (err) {
      renderEmptyRow(trendTableBody, 4, 'Failed to load category trend.');
      clearDetail();
      setStatus(err.message, 'status-error');
    } finally {
      loadButton.disabled = false;
      categorySelect.disabled = false;
    }
  }

  async function loadCatalogAndTrend(options = {}) {
    const params = buildCatalogQueryFromControls();
    const querySuffix = params.toString() ? `?${params.toString()}` : '';

    setStatus('Loading categories and range...');
    loadButton.disabled = true;
    presetSelect.disabled = true;
    startMonthSelect.disabled = true;
    endMonthSelect.disabled = true;
    categorySelect.disabled = true;

    try {
      const payload = await fetchJson(`/api/ad-hoc/category-trends/categories${querySuffix}`);
      availableMonths = Array.isArray(payload.available_months) ? payload.available_months : [];
      currentRange = payload.range;

      populateMonthSelect(startMonthSelect, availableMonths, payload.range.start_month);
      populateMonthSelect(endMonthSelect, availableMonths, payload.range.end_month);
      presetSelect.value = payload.range.preset_applied || presetSelect.value;
      syncRangeControlsEnabledState();
      updateCutoffNote(payload.canonical_cutoff, payload.range);

      const preferredCategory = options.preferredCategoryKey || categorySelect.value || payload.default_category_key;
      const selectedCategory = populateCategorySelect(payload.categories || [], preferredCategory);

      if (!selectedCategory) {
        trendSummaryEl.textContent = `No categories found for ${payload.range.start_month} through ${payload.range.end_month}.`;
        renderEmptyRow(trendTableBody, 4, 'No category totals found in the selected range.');
        clearDetail();
        setStatus('Range loaded, but no categories are available in that window.', 'status-ok');
        return;
      }

      await loadTrendForSelectedCategory();
    } catch (err) {
      renderEmptyRow(trendTableBody, 4, 'Failed to load category catalog.');
      clearDetail();
      setStatus(err.message, 'status-error');
    } finally {
      loadButton.disabled = false;
      presetSelect.disabled = false;
      categorySelect.disabled = false;
      syncRangeControlsEnabledState();
    }
  }

  function validateCustomRangeBeforeLoad() {
    if (presetSelect.value !== 'custom') return true;

    if (!startMonthSelect.value || !endMonthSelect.value) {
      setStatus('Custom range requires both start and end month.', 'status-error');
      return false;
    }

    if (startMonthSelect.value > endMonthSelect.value) {
      setStatus('Custom range start month must be on or before end month.', 'status-error');
      return false;
    }

    return true;
  }

  loadButton.addEventListener('click', () => {
    if (!validateCustomRangeBeforeLoad()) return;
    loadCatalogAndTrend({
      preferredCategoryKey: categorySelect.value,
    });
  });

  categorySelect.addEventListener('change', () => {
    loadTrendForSelectedCategory();
  });

  presetSelect.addEventListener('change', () => {
    syncRangeControlsEnabledState();
  });

  syncRangeControlsEnabledState();
  renderEmptyRow(trendTableBody, 4, 'Loading category trend data...');
  clearDetail();
  loadCatalogAndTrend();
})();
