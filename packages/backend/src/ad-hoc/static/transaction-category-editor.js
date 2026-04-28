(function (global) {
  function currentCategoryValue(rowData) {
    if (!rowData) return '';
    if (rowData.rule_source !== 'rule_override' && rowData.category_source !== 'manual_override') return '';
    if (rowData.one_time_event_id) return `event:${rowData.one_time_event_id}`;
    const category = rowData.effective_category || rowData.bucket || '';
    return category ? `category:${category}` : '';
  }

  function defaultRuleCategory(rowData) {
    if (!rowData) return 'Undefined';
    return rowData.default_rule_category || rowData.bucket || rowData.effective_category || 'Undefined';
  }

  function buildCategorySelect(options) {
    const rowData = options && options.rowData ? options.rowData : {};
    const categoryOptions = Array.isArray(options && options.categoryOptions)
      ? options.categoryOptions
      : [];
    const ariaLabel = options && options.ariaLabel
      ? String(options.ariaLabel)
      : `Override category for transaction ${rowData.transaction_id || ''}`.trim();

    const select = document.createElement('select');
    select.className = 'category-override-select';
    select.setAttribute('aria-label', ariaLabel);

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = `Use default (${defaultRuleCategory(rowData)})`;
    select.appendChild(defaultOption);

    const seen = new Set();
    for (const category of categoryOptions) {
      if (!category || !category.category_key) continue;
      const value = category.select_value || `category:${category.category_key}`;
      if (seen.has(value)) continue;
      seen.add(value);
      const option = document.createElement('option');
      option.value = value;
      option.dataset.category = category.category_key;
      if (category.one_time_event_id) {
        option.dataset.oneTimeEventId = String(category.one_time_event_id);
      }
      option.textContent = category.destination_label || category.category_label || category.category_key;
      select.appendChild(option);
    }

    const effective = rowData.effective_category || rowData.bucket || '';
    const effectiveValue = effective ? `category:${effective}` : '';
    if (
      effective &&
      rowData.category_source === 'manual_override' &&
      !rowData.one_time_event_id &&
      !seen.has(effectiveValue)
    ) {
      const option = document.createElement('option');
      option.value = effectiveValue;
      option.dataset.category = effective;
      option.textContent = effective;
      select.appendChild(option);
    }

    select.value = currentCategoryValue(rowData);

    if (typeof (options && options.onChange) === 'function') {
      select.addEventListener('change', () => {
        options.onChange(select);
      });
    }

    return select;
  }

  function buildGeneralRuleCheckbox(options) {
    const rowData = options && options.rowData ? options.rowData : {};
    const selectEl = options && options.selectEl ? options.selectEl : null;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'general-rule-checkbox';
    checkbox.checked = rowData.rule_source === 'rule_override';
    checkbox.disabled = !selectEl || !selectEl.value;

    const label = document.createElement('label');
    label.className = 'general-rule-label';
    label.title = 'Save this dropdown choice as the general rule for this normalized description.';
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(' General rule'));

    if (selectEl) {
      selectEl.addEventListener('change', () => {
        checkbox.disabled = !selectEl.value;
        if (!selectEl.value) checkbox.checked = false;
      });
    }

    if (typeof (options && options.onChange) === 'function') {
      checkbox.addEventListener('change', () => {
        options.onChange(checkbox);
      });
    }

    return label;
  }

  function buildCategoryEditor(options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'category-editor-wrap';
    const select = buildCategorySelect(options);
    wrapper.appendChild(select);
    wrapper.appendChild(buildGeneralRuleCheckbox({
      rowData: options && options.rowData,
      selectEl: select,
      onChange: (checkbox) => {
        if (typeof (options && options.onGeneralRuleChange) === 'function') {
          options.onGeneralRuleChange(select, checkbox);
        }
      },
    }));
    return wrapper;
  }

  function buildOverridePayload(selectEl, options = {}) {
    const selectedOption = selectEl && selectEl.selectedOptions ? selectEl.selectedOptions[0] : null;
    const nextCategory = selectedOption ? selectedOption.dataset.category : '';
    const nextOneTimeEventId = selectedOption ? selectedOption.dataset.oneTimeEventId : null;

    if (options.removeGeneralRule) {
      return { remove_general_rule: true };
    }

    if (!selectEl || !selectEl.value) {
      return { mode: 'rule_based' };
    }

    return {
      category: nextCategory,
      one_time_event_id: nextOneTimeEventId ? Number(nextOneTimeEventId) : null,
      apply_as_rule: Boolean(options.applyAsRule),
    };
  }

  function mergeUpdatedTransaction(rows, updatedTransaction) {
    if (!Array.isArray(rows) || !updatedTransaction || !updatedTransaction.transaction_id) return false;
    const index = rows.findIndex((row) => row.transaction_id === updatedTransaction.transaction_id);
    if (index < 0) return false;

    rows[index] = {
      ...rows[index],
      ...updatedTransaction,
    };
    return true;
  }

  function buildNormalizedDescriptionCell(rowData, options = {}) {
    const cell = document.createElement('td');
    cell.className = 'normalized-cell';

    const wrap = document.createElement('div');
    wrap.className = 'transaction-description-wrap';

    const text = document.createElement('span');
    text.className = 'transaction-normalized-description';
    text.textContent = rowData && rowData.normalized_description ? rowData.normalized_description : '';
    if (rowData && rowData.raw_description) {
      text.title = rowData.raw_description;
    }
    wrap.appendChild(text);

    const notes = rowData && rowData.notes ? String(rowData.notes) : '';
    if (notes) {
      const noteIcon = document.createElement('span');
      noteIcon.className = 'transaction-note-icon';
      noteIcon.textContent = 'note';
      noteIcon.title = notes;
      noteIcon.setAttribute('aria-label', `Transaction note: ${notes}`);
      wrap.appendChild(noteIcon);
    }

    if (typeof options.onEditNotes === 'function') {
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'transaction-note-edit-button';
      editButton.textContent = 'edit';
      editButton.title = notes ? 'Edit transaction note' : 'Add transaction note';
      editButton.setAttribute('aria-label', editButton.title);
      editButton.addEventListener('click', () => {
        options.onEditNotes(rowData);
      });
      wrap.appendChild(editButton);
    }

    cell.appendChild(wrap);
    if (rowData && rowData.raw_description && rowData.raw_description !== rowData.normalized_description) {
      const raw = document.createElement('div');
      raw.className = 'raw-description-inline';
      raw.textContent = `Raw: ${rowData.raw_description}`;
      cell.appendChild(raw);
    }

    return cell;
  }

  async function saveTransactionNotes(rowData, options = {}) {
    if (!rowData || !rowData.transaction_id) return null;
    const currentNotes = rowData.notes || '';
    const nextNotes = window.prompt('Transaction note', currentNotes);
    if (nextNotes == null) return null;

    const response = await fetch(`/api/ad-hoc/transactions/${encodeURIComponent(rowData.transaction_id)}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: nextNotes }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok === false) {
      throw new Error(payload && payload.error ? payload.error : `Save failed with HTTP ${response.status}`);
    }

    if (typeof options.onSaved === 'function') {
      options.onSaved(payload.transaction);
    }
    return payload.transaction;
  }

  function sumAmounts(rows) {
    if (!Array.isArray(rows)) return 0;
    return Number(rows.reduce((sum, row) => sum + (Number(row && row.amount) || 0), 0).toFixed(2));
  }

  global.MykneesTransactionCategoryEditor = {
    currentCategoryValue,
    defaultRuleCategory,
    buildCategorySelect,
    buildCategoryEditor,
    buildOverridePayload,
    buildNormalizedDescriptionCell,
    saveTransactionNotes,
    mergeUpdatedTransaction,
    sumAmounts,
  };
})(window);
