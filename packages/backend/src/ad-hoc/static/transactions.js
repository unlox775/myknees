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

  const storageKey = 'myknees.ad_hoc.all_transactions_state.v1';
  const allMonthsValue = 'all';

  const yearInput = document.getElementById('transactions-year-input');
  const monthSelect = document.getElementById('transactions-month-select');
  const accountSelect = document.getElementById('transactions-account-select');
  const searchInput = document.getElementById('transactions-search-input');
  const loadButton = document.getElementById('transactions-load-button');
  const statusEl = document.getElementById('transactions-status');
  const summaryEl = document.getElementById('transactions-summary');
  const tableBody = document.getElementById('transactions-table-body');

  const categoryEditor = window.MykneesTransactionCategoryEditor;

  let currentWindow = null;
  let currentRows = [];
  let filteredRows = [];
  let categoryOptions = [];
  let availableAccounts = [];
  let activeAccountIdentifier = 'all';
  let loadRequestSeq = 0;
  let autoLoadTimer = null;

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
      // Local storage is convenience-only.
    }
  }

  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className = `status ${type || ''}`.trim();
  }

  function scheduleLoadTransactions() {
    if (autoLoadTimer) window.clearTimeout(autoLoadTimer);
    autoLoadTimer = window.setTimeout(() => {
      loadTransactions();
    }, 150);
  }

  function amountClass(value) {
    const n = Number(value);
    if (n < 0) return 'amount-negative';
    if (n > 0) return 'amount-positive';
    return '';
  }

  function renderEmptyRow(colCount, text) {
    tableBody.innerHTML = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colCount;
    cell.className = 'empty-cell';
    cell.textContent = text;
    row.appendChild(cell);
    tableBody.appendChild(row);
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

  function formatAmount(value) {
    return moneyFormat.format(Number(value) || 0);
  }

  function buildMonthOptions() {
    monthSelect.innerHTML = '';

    const allMonthsOption = document.createElement('option');
    allMonthsOption.value = allMonthsValue;
    allMonthsOption.textContent = 'All months';
    monthSelect.appendChild(allMonthsOption);

    for (let index = 0; index < monthNames.length; index += 1) {
      const option = document.createElement('option');
      option.value = String(index + 1);
      option.textContent = monthNames[index];
      monthSelect.appendChild(option);
    }
  }

  function formatMonthYear(windowInfo) {
    if (windowInfo.month_scope === allMonthsValue || windowInfo.month == null) {
      return windowInfo.display_label || `All months ${windowInfo.year}`;
    }
    const monthName = monthNames[(windowInfo.month || 1) - 1] || `Month ${windowInfo.month}`;
    return `${monthName} ${windowInfo.year}`;
  }

  function getSelection() {
    const year = parseInt(yearInput.value, 10);
    const rawMonth = String(monthSelect.value || '').trim();
    const account = String(accountSelect.value || 'all').trim() || 'all';

    if (!Number.isInteger(year) || year < 1970 || year > 3000) {
      throw new Error('Year must be between 1970 and 3000.');
    }
    if (rawMonth === allMonthsValue) {
      return { year, month: allMonthsValue, account };
    }

    const month = parseInt(rawMonth, 10);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12.');
    }

    return { year, month, account };
  }

  function setCurrentMonthDefaults() {
    const saved = loadSavedState();
    const now = new Date();
    const year = Number.isInteger(saved.year) ? saved.year : now.getFullYear();
    const month = saved.month === allMonthsValue
      ? allMonthsValue
      : Number.isInteger(saved.month)
        ? saved.month
        : now.getMonth() + 1;
    yearInput.value = String(year);
    monthSelect.value = String(month);
    searchInput.value = String(saved.search_text || '');
  }

  function populateAccountSelect(accounts, selectedIdentifier) {
    accountSelect.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All accounts';
    accountSelect.appendChild(allOption);

    for (const account of accounts) {
      if (!account || !account.identifier) continue;
      const option = document.createElement('option');
      option.value = account.identifier;
      const txCount = Number(account.month_transaction_count) || 0;
      const amountText = formatAmount(account.month_total_amount);
      option.textContent = `${account.name || account.identifier} (${txCount} tx, ${amountText})`;
      option.title = account.identifier;
      accountSelect.appendChild(option);
    }

    const desired = String(selectedIdentifier || 'all');
    const hasDesired = [...accountSelect.options].some((option) => option.value === desired);
    accountSelect.value = hasDesired ? desired : 'all';
  }

  function normalizeSearchToken(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function amountSearchTokens(value) {
    const amount = Number(value) || 0;
    const abs = Math.abs(amount);
    const currency = formatAmount(amount);
    const absCurrency = formatAmount(abs);
    return [
      String(amount),
      amount.toFixed(2),
      abs.toFixed(2),
      currency,
      currency.replace(/\$/g, ''),
      absCurrency,
      absCurrency.replace(/\$/g, ''),
      String(Math.round(amount * 100)),
    ];
  }

  function buildSearchText(rowData) {
    const pieces = [
      rowData.date,
      rowData.transaction_id,
      rowData.account_identifier,
      rowData.account_name,
      rowData.normalized_description,
      rowData.raw_description,
      rowData.notes,
      rowData.effective_category,
      rowData.default_rule_category,
      rowData.bucket,
      ...amountSearchTokens(rowData.amount),
    ];
    return pieces
      .filter((piece) => piece != null && String(piece).trim() !== '')
      .map((piece) => String(piece).toLowerCase())
      .join(' | ');
  }

  function accountLabel(identifier) {
    if (identifier === 'all') return 'All accounts';
    const match = availableAccounts.find((row) => row.identifier === identifier);
    return match ? (match.name || match.identifier) : identifier;
  }

  function computeVisibleTotal(rows) {
    return categoryEditor ? categoryEditor.sumAmounts(rows) : 0;
  }

  function updateSummary(searchTerm) {
    if (!currentWindow) {
      summaryEl.textContent = '';
      return;
    }

    const visibleTotal = computeVisibleTotal(filteredRows);
    const loadedTotal = computeVisibleTotal(currentRows);
    const scopeLabel = `${formatMonthYear(currentWindow)} - ${accountLabel(activeAccountIdentifier)}`;

    if (searchTerm) {
      summaryEl.textContent =
        `${scopeLabel}: showing ${filteredRows.length} of ${currentRows.length} transactions ` +
        `(filtered net ${formatAmount(visibleTotal)}; loaded net ${formatAmount(loadedTotal)}).`;
      return;
    }

    summaryEl.textContent =
      `${scopeLabel}: showing all ${currentRows.length} loaded transactions ` +
      `(net ${formatAmount(loadedTotal)}).`;
  }

  function buildCategoryCell(rowData) {
    const wrap = document.createElement('div');
    wrap.className = 'category-cell';

    const effectiveCategory = rowData.effective_category || rowData.bucket || 'Undefined';
    const label = document.createElement('div');
    label.textContent = effectiveCategory;
    wrap.appendChild(label);

    const source = document.createElement('div');
    source.className = 'category-source-note';
    if (rowData.category_source === 'manual_override') {
      if (rowData.one_time_event_display_name) {
        source.textContent = `Manual override (${rowData.one_time_event_display_name})`;
      } else {
        source.textContent = 'Manual override';
      }
    } else {
      source.textContent = `Rule default: ${rowData.default_rule_category || effectiveCategory}`;
    }
    wrap.appendChild(source);

    return wrap;
  }

  function generalRuleStatusText(prefix, ruleResult) {
    if (!ruleResult || !Number.isInteger(ruleResult.matching_transaction_count)) return prefix;
    const count = ruleResult.matching_transaction_count;
    const noun = count === 1 ? 'transaction' : 'transactions';
    return `${prefix} General rule refreshed ${count} matching ${noun}.`;
  }

  function renderRows(searchTerm) {
    updateSummary(searchTerm);

    if (!filteredRows.length) {
      const emptyMessage = searchTerm
        ? 'No search matches in the currently loaded month/account set.'
        : 'No transactions found for the selected month/account.';
      renderEmptyRow(7, emptyMessage);
      return;
    }

    tableBody.innerHTML = '';

    for (const rowData of filteredRows) {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = rowData.date || '';

      const accountCell = document.createElement('td');
      accountCell.textContent = rowData.account_name || rowData.account_identifier || '';
      accountCell.title = rowData.account_identifier || '';

      const amountCell = document.createElement('td');
      amountCell.className = `numeric ${amountClass(rowData.amount)}`.trim();
      amountCell.textContent = formatAmount(rowData.amount);

      const normalizedCell = categoryEditor.buildNormalizedDescriptionCell(rowData, {
        onEditNotes: saveTransactionNotes,
      });

      const categoryCell = document.createElement('td');
      categoryCell.appendChild(buildCategoryCell(rowData));

      const overrideCell = document.createElement('td');
      overrideCell.appendChild(categoryEditor.buildCategoryEditor({
        rowData,
        categoryOptions,
        ariaLabel: `Override category for transaction ${rowData.transaction_id}`,
        onChange: (selectEl) => {
          const wrapper = selectEl.closest('.category-editor-wrap');
          const checkboxEl = wrapper ? wrapper.querySelector('.general-rule-checkbox') : null;
          saveCategoryOverride(rowData, selectEl, {
            applyAsRule: Boolean(checkboxEl && checkboxEl.checked),
          });
        },
        onGeneralRuleChange: (selectEl, checkboxEl) => {
          saveCategoryOverride(rowData, selectEl, {
            applyAsRule: checkboxEl.checked,
            removeGeneralRule: !checkboxEl.checked,
          });
        },
      }));

      const idCell = document.createElement('td');
      idCell.className = 'numeric';
      idCell.textContent = String(rowData.transaction_id || '');

      row.appendChild(dateCell);
      row.appendChild(accountCell);
      row.appendChild(amountCell);
      row.appendChild(normalizedCell);
      row.appendChild(categoryCell);
      row.appendChild(overrideCell);
      row.appendChild(idCell);

      tableBody.appendChild(row);
    }
  }

  function applySearchFilter() {
    const searchTerm = normalizeSearchToken(searchInput.value);
    filteredRows = searchTerm
      ? currentRows.filter((row) => row._search_text && row._search_text.includes(searchTerm))
      : [...currentRows];

    renderRows(searchTerm);
    saveState({
      search_text: searchInput.value || '',
    });
  }

  async function saveTransactionNotes(rowData) {
    setStatus(`Saving note for transaction ${rowData.transaction_id}...`);
    try {
      await categoryEditor.saveTransactionNotes(rowData, {
        onSaved: (updatedTransaction) => {
          const updated = {
            ...updatedTransaction,
            _search_text: buildSearchText(updatedTransaction),
          };
          categoryEditor.mergeUpdatedTransaction(currentRows, updated);
        },
      });
      applySearchFilter();
      setStatus('Transaction note saved.', 'status-ok');
    } catch (err) {
      setStatus(err.message, 'status-error');
    }
  }

  async function saveCategoryOverride(rowData, selectEl, options = {}) {
    const previousValue = categoryEditor.currentCategoryValue(rowData);
    const wrapper = selectEl.closest('.category-editor-wrap');
    const checkboxEl = wrapper ? wrapper.querySelector('.general-rule-checkbox') : null;
    const previousChecked = checkboxEl ? checkboxEl.checked : false;
    const isGeneralRuleSave = Boolean(options.applyAsRule || options.removeGeneralRule);

    if (options.applyAsRule && !selectEl.value) {
      if (checkboxEl) checkboxEl.checked = false;
      setStatus('Choose a category before saving a general rule.', 'status-error');
      return;
    }

    selectEl.disabled = true;
    if (checkboxEl) checkboxEl.disabled = true;
    setStatus(
      isGeneralRuleSave
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

      if (Array.isArray(payload.category_options)) {
        categoryOptions = payload.category_options;
      }

      if (payload.transaction) {
        const updated = {
          ...payload.transaction,
          _search_text: buildSearchText(payload.transaction),
        };
        categoryEditor.mergeUpdatedTransaction(currentRows, updated);
      }

      if (isGeneralRuleSave) {
        await loadTransactions({
          quiet: true,
          statusText: generalRuleStatusText('Category saved.', payload.rule_result),
        });
        return;
      }

      applySearchFilter();
      setStatus('Category saved. Search results were refreshed using the updated row values.', 'status-ok');
    } catch (err) {
      selectEl.value = previousValue;
      if (checkboxEl) checkboxEl.checked = previousChecked;
      setStatus(err.message, 'status-error');
    } finally {
      selectEl.disabled = false;
      if (checkboxEl) checkboxEl.disabled = !selectEl.value;
    }
  }

  async function loadTransactions(options = {}) {
    const requestSeq = ++loadRequestSeq;
    let selection;
    try {
      selection = getSelection();
    } catch (err) {
      setStatus(err.message, 'status-error');
      return;
    }

    const monthLabel = selection.month === allMonthsValue
      ? `all months in ${selection.year}`
      : `${monthNames[selection.month - 1] || `Month ${selection.month}`} ${selection.year}`;
    if (!options.quiet) {
      setStatus(`Loading ${monthLabel} transactions...`);
    }
    loadButton.disabled = true;
    accountSelect.disabled = true;

    try {
      const params = new URLSearchParams();
      params.set('year', selection.year);
      params.set('month', selection.month);
      params.set('account', selection.account || 'all');
      const payload = await fetchJson(`/api/ad-hoc/transactions?${params.toString()}`);
      if (requestSeq !== loadRequestSeq) return;

      currentWindow = payload.window || null;
      categoryOptions = Array.isArray(payload.category_options) ? payload.category_options : [];
      availableAccounts = Array.isArray(payload.available_accounts) ? payload.available_accounts : [];

      const selectedAccount = payload.selected_account && payload.selected_account.identifier
        ? payload.selected_account.identifier
        : selection.account;
      activeAccountIdentifier = selectedAccount || 'all';
      populateAccountSelect(availableAccounts, activeAccountIdentifier);

      currentRows = Array.isArray(payload.transactions)
        ? payload.transactions.map((row) => ({
            ...row,
            _search_text: buildSearchText(row),
          }))
        : [];
      filteredRows = [...currentRows];
      applySearchFilter();

      saveState({
        year: selection.year,
        month: selection.month,
        account: activeAccountIdentifier,
      });

      const loadedWindow = currentWindow || {
        year: selection.year,
        month: selection.month,
        month_scope: selection.month === allMonthsValue ? allMonthsValue : 'single',
      };
      setStatus(
        options.statusText ||
          `${formatMonthYear(loadedWindow)} loaded for ${accountLabel(activeAccountIdentifier)}. ` +
            'Search filters locally as you type.',
        'status-ok'
      );
    } catch (err) {
      if (requestSeq !== loadRequestSeq) return;
      currentRows = [];
      filteredRows = [];
      renderEmptyRow(7, 'Failed to load transactions.');
      summaryEl.textContent = '';
      setStatus(err.message, 'status-error');
    } finally {
      loadButton.disabled = false;
      accountSelect.disabled = false;
    }
  }

  if (!categoryEditor) {
    renderEmptyRow(7, 'Category editor helper failed to load.');
    setStatus('Category editor helper failed to load. Refresh this page.', 'status-error');
    return;
  }

  loadButton.addEventListener('click', loadTransactions);
  searchInput.addEventListener('input', applySearchFilter);
  yearInput.addEventListener('change', () => {
    saveState({ year: parseInt(yearInput.value, 10) });
    scheduleLoadTransactions();
  });
  yearInput.addEventListener('input', () => {
    saveState({ year: parseInt(yearInput.value, 10) });
    scheduleLoadTransactions();
  });
  monthSelect.addEventListener('change', () => {
    saveState({ month: monthSelect.value === allMonthsValue ? allMonthsValue : parseInt(monthSelect.value, 10) });
    scheduleLoadTransactions();
  });
  accountSelect.addEventListener('change', () => {
    saveState({ account: accountSelect.value || 'all' });
    scheduleLoadTransactions();
  });

  buildMonthOptions();
  setCurrentMonthDefaults();

  const saved = loadSavedState();
  populateAccountSelect([], saved.account || 'all');
  renderEmptyRow(7, 'Loading transactions...');
  loadTransactions();
})();
