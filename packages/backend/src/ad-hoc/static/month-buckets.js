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

  let currentWindow = null;

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
    const now = new Date();
    yearInput.value = String(now.getFullYear());
    monthSelect.value = String(now.getMonth() + 1);
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
    detailSelectedEl.textContent = 'No bucket selected.';
    renderEmptyRow(detailBody, 5, 'Select a bucket in the summary table.');
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

  function renderSummary(payload) {
    const buckets = Array.isArray(payload.buckets) ? payload.buckets : [];
    currentWindow = payload.window;

    summaryTotalsEl.textContent = `${formatMonthYear(payload.window)}: ${payload.totals.transaction_count} transactions across ${payload.totals.bucket_count} buckets (net ${formatAmount(payload.totals.total_amount)}).`;

    if (!buckets.length) {
      renderEmptyRow(summaryBody, 3, 'No transactions found in this month.');
      clearDetails();
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

    clearDetails();
  }

  function renderDetail(payload) {
    const rows = Array.isArray(payload.transactions) ? payload.transactions : [];

    detailSelectedEl.textContent = `${payload.bucket}: ${payload.transaction_count} transactions (net ${formatAmount(payload.total_amount)}).`;

    if (!rows.length) {
      renderEmptyRow(detailBody, 5, 'No transactions found for this bucket in the selected month.');
      return;
    }

    detailBody.innerHTML = '';

    for (const rowData of rows) {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = rowData.date;

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
      idCell.textContent = String(rowData.transaction_id);

      row.appendChild(dateCell);
      row.appendChild(accountCell);
      row.appendChild(amountCell);
      row.appendChild(normalizedCell);
      row.appendChild(idCell);

      detailBody.appendChild(row);
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
      setStatus(`${formatMonthYear(payload.window)} loaded. Click a bucket to inspect details.`, 'status-ok');
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
    renderEmptyRow(detailBody, 5, 'Loading bucket detail...');

    try {
      const encodedBucket = encodeURIComponent(bucketName);
      const url = `/api/ad-hoc/month-buckets/${encodedBucket}/transactions?year=${currentWindow.year}&month=${currentWindow.month}`;
      const payload = await fetchJson(url);
      renderDetail(payload);
    } catch (err) {
      detailSelectedEl.textContent = `Failed to load ${bucketName}.`;
      renderEmptyRow(detailBody, 5, err.message);
    }
  }

  loadButton.addEventListener('click', loadMonthSummary);

  buildMonthOptions();
  setCurrentMonthDefaults();
  renderEmptyRow(summaryBody, 3, 'Loading current month...');
  clearDetails();
  loadMonthSummary();
})();
