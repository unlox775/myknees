(function () {
  const SHAPES = ['triangle', 'wave', 'quarter-circle', 'brick'];
  const STORAGE_KEY = 'myknees.ad_hoc.spread_graph.v1';
  const PROJECTION_SCENARIO_STORAGE_KEY = 'myknees.ad_hoc.projection_scenario_inputs.v1';
  const COLORS = [
    '#2f6fb7', '#b85c38', '#4f8f5f', '#8b64b0', '#c79a22', '#3b8ea5',
    '#a94f7a', '#6c7a28', '#7f6a55', '#536b92', '#b06b2c', '#427a5b',
  ];

  const moneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const endMonthSelect = document.getElementById('spread-end-month');
  const defaultShapeSelect = document.getElementById('spread-default-shape');
  const defaultDaysInput = document.getElementById('spread-default-days');
  const defaultDaysLabel = document.getElementById('spread-default-days-label');
  const flattenRecurringInput = document.getElementById('spread-flatten-recurring');
  const loadButton = document.getElementById('spread-load-button');
  const statusEl = document.getElementById('spread-status');
  const cutoffNoteEl = document.getElementById('spread-cutoff-note');
  const chartEl = document.getElementById('spread-chart');
  const transactionTooltipEl = document.getElementById('spread-transaction-tooltip');
  const legendEl = document.getElementById('spread-legend');
  const categoryControlsEl = document.getElementById('spread-category-controls');

  let payload = null;
  let overrides = new Map();

  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className = `status ${type || ''}`.trim();
  }

  function readSaved() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
      overrides = new Map(Object.entries(saved.overrides || {}));
      if (saved.default_shape && SHAPES.includes(saved.default_shape)) defaultShapeSelect.value = saved.default_shape;
      if (saved.default_days) defaultDaysInput.value = String(Math.max(1, Math.min(60, Number(saved.default_days) || 7)));
      flattenRecurringInput.checked = Boolean(saved.flatten_recurring);
      if (saved.end_month) endMonthSelect.dataset.preferredMonth = saved.end_month;
    } catch (_err) {
      overrides = new Map();
    }
  }

  function writeSaved() {
    const overrideObj = {};
    for (const [key, value] of overrides.entries()) overrideObj[key] = value;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      default_shape: defaultShapeSelect.value,
      default_days: Number(defaultDaysInput.value) || 7,
      flatten_recurring: flattenRecurringInput.checked,
      end_month: endMonthSelect.value,
      overrides: overrideObj,
    }));
  }

  function readProjectionScenarioCategoryOverrides() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PROJECTION_SCENARIO_STORAGE_KEY) || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
      const overridesByCategory = saved.category_overrides;
      if (!overridesByCategory || typeof overridesByCategory !== 'object' || Array.isArray(overridesByCategory)) return {};
      return overridesByCategory;
    } catch (_err) {
      return {};
    }
  }

  function effectiveBudgetDaily() {
    const budget = payload && payload.budget ? payload.budget : {};
    const monthlyByCategory = new Map(Object.entries(budget.by_category || {}));
    const scenarioOverrides = readProjectionScenarioCategoryOverrides();
    let overrideCount = 0;

    for (const [category, value] of Object.entries(scenarioOverrides)) {
      const parsed = Number(String(value).trim());
      if (!Number.isFinite(parsed) || parsed < 0) continue;
      monthlyByCategory.set(category, parsed);
      overrideCount += 1;
    }

    const monthlyTotal = [...monthlyByCategory.values()].reduce((sum, value) => sum + (Number(value) || 0), 0);
    return {
      daily: Number((monthlyTotal / 30.5).toFixed(2)),
      monthly: Number(monthlyTotal.toFixed(2)),
      overrideCount,
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(body && body.error ? body.error : `Request failed (${response.status}).`);
    return body;
  }

  function dateAdd(date, days) {
    const d = new Date(`${date}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function weights(shape, days) {
    const n = Math.max(1, Math.min(60, Math.round(Number(days) || 7)));
    const raw = [];
    for (let i = 0; i < n; i += 1) {
      const t = n === 1 ? 0 : i / (n - 1);
      if (shape === 'brick') raw.push(1);
      else if (shape === 'triangle') raw.push(1 - 0.999 * t);
      else if (shape === 'quarter-circle') raw.push(Math.max(0.001, Math.sqrt(Math.max(0, 1 - t * t))));
      else raw.push(0.001 + 0.999 * (1 - (3 * t * t - 2 * t * t * t)));
    }
    const sum = raw.reduce((acc, value) => acc + value, 0) || 1;
    return raw.map((value) => value / sum);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hexToRgb(hex) {
    const normalized = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return { r: 120, g: 120, b: 120 };
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  function rgbToHex(rgb) {
    return `#${[rgb.r, rgb.g, rgb.b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
  }

  function shadeColor(hex, percent) {
    const rgb = hexToRgb(hex);
    const adjusted = {};
    for (const channel of ['r', 'g', 'b']) {
      adjusted[channel] = percent >= 0
        ? rgb[channel] + (255 - rgb[channel]) * percent
        : rgb[channel] * (1 + percent);
    }
    return rgbToHex(adjusted);
  }

  function categorySetting(categoryKey) {
    const override = overrides.get(categoryKey);
    if (override && (override.override || override.hidden)) return override;
    return {
      override: false,
      hidden: false,
      shape: defaultShapeSelect.value || 'wave',
      days: Number(defaultDaysInput.value) || 7,
    };
  }

  function flattenedRecurringSetting(tx) {
    if (!flattenRecurringInput.checked) return null;
    const spans = payload && payload.recurring_series
      ? payload.recurring_series.spans_by_transaction_id || {}
      : {};
    const span = spans[String(tx.transaction_id)] || spans[tx.transaction_id];
    if (!span) return null;
    const days = Math.max(1, Math.round(Number(span.spread_days) || 1));
    return {
      shape: 'brick',
      days,
      recurring_series: span,
    };
  }

  function computeDailySeries() {
    const days = payload.window.days;
    const dayIndex = new Map(days.map((day, index) => [day, index]));
    const categoryRows = payload.categories;
    const categoryByKey = new Map(categoryRows.map((category, categoryIndex) => [
      category.category_key,
      {
        ...category,
        color: COLORS[categoryIndex % COLORS.length],
        transactionLayers: [],
        values: new Array(days.length).fill(0),
      },
    ]));

    payload.transactions.forEach((tx, txIndex) => {
      const recurringSetting = flattenedRecurringSetting(tx);
      const setting = recurringSetting || categorySetting(tx.category);
      const category = categoryByKey.get(tx.category);
      if (!category) return;
      const ratios = weights(setting.shape, setting.days);
      const values = new Array(days.length).fill(0);
      for (let i = 0; i < ratios.length; i += 1) {
        const day = dateAdd(tx.date, i);
        const idx = dayIndex.get(day);
        if (idx == null) continue;
        values[idx] += tx.amount_abs * ratios[i];
        category.values[idx] += tx.amount_abs * ratios[i];
      }
      category.transactionLayers.push({
        ...tx,
        recurring_series: recurringSetting ? recurringSetting.recurring_series : null,
        layer_index: txIndex,
        layer_id: `tx-${tx.transaction_id}-${txIndex}`,
        fill: shadeColor(category.color, txIndex % 2 === 0 ? 0.05 : -0.05),
        values: values.map((value) => Number(value.toFixed(2))),
      });
    });

    return categoryRows.map((category, categoryIndex) => {
      const setting = categorySetting(category.category_key);
      const row = categoryByKey.get(category.category_key);
      return {
        ...row,
        hidden: Boolean(setting.hidden),
        color: row.color || COLORS[categoryIndex % COLORS.length],
        values: setting.hidden
          ? new Array(days.length).fill(0)
          : row.values.map((value) => Number(value.toFixed(2))),
        transactionLayers: setting.hidden ? [] : row.transactionLayers,
      };
    });
  }

  function orderSeriesForGraph(series) {
    if (!flattenRecurringInput.checked) return series;
    const recurringRows = [];
    const otherRows = [];
    for (const row of series) {
      if (row.transactionLayers.some((tx) => tx.recurring_series)) recurringRows.push(row);
      else otherRows.push(row);
    }
    return [...recurringRows, ...otherRows];
  }

  function rectsForLayer(xForDay, barWidth, yScale, baseline, tx) {
    const pieces = [];
    const tooltip = escapeHtml(transactionTooltipHtml(tx));
    const label = escapeHtml(tx.normalized_description || tx.raw_description || tx.category);
    for (let i = 0; i < tx.values.length; i += 1) {
      const value = tx.values[i];
      if (value <= 0) continue;
      const yTop = yScale(baseline[i] + value);
      const yBottom = yScale(baseline[i]);
      pieces.push(`<rect class="spread-transaction-layer" x="${xForDay(i)}" y="${yTop}" width="${barWidth}" height="${Math.max(0, yBottom - yTop)}" fill="${tx.fill}" opacity="0.9" tabindex="0" data-layer-id="${escapeHtml(tx.layer_id)}" data-tooltip="${tooltip}"><title>${label}</title></rect>`);
    }
    return pieces;
  }

  function transactionTooltipHtml(tx) {
    return `
      <strong>${escapeHtml(tx.normalized_description || tx.raw_description || 'Transaction')}</strong>
      <span>Date: ${escapeHtml(tx.date)}</span>
      <span>Amount: ${moneyFormat.format(Number(tx.amount) || 0)}</span>
      <span>Category: ${escapeHtml(tx.category)}</span>
      <span>Account: ${escapeHtml(tx.account_identifier || '')}</span>
      ${tx.recurring_series ? `<span>Recurring: ${escapeHtml(tx.recurring_series.display_name)} through ${escapeHtml(tx.recurring_series.next_date)} (${escapeHtml(tx.recurring_series.spread_days)} brick days)</span>` : ''}
    `;
  }

  function positionTransactionTooltip(layer) {
    const wrapRect = chartEl.parentElement.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const tooltipRect = transactionTooltipEl.getBoundingClientRect();
    const margin = 10;
    let left = layerRect.left - wrapRect.left + (layerRect.width / 2) - (tooltipRect.width / 2) + chartEl.parentElement.scrollLeft;
    let top = layerRect.top - wrapRect.top - tooltipRect.height - margin + chartEl.parentElement.scrollTop;

    left = Math.max(margin, Math.min(left, chartEl.parentElement.scrollLeft + wrapRect.width - tooltipRect.width - margin));
    if (top < margin) {
      top = layerRect.bottom - wrapRect.top + margin + chartEl.parentElement.scrollTop;
    }

    transactionTooltipEl.style.left = `${left}px`;
    transactionTooltipEl.style.top = `${top}px`;
  }

  function showTransactionTooltip(layer) {
    const layerId = layer.dataset.layerId || '';
    chartEl.querySelectorAll('.spread-transaction-layer.is-hovered').forEach((el) => {
      el.classList.remove('is-hovered');
    });
    chartEl.querySelectorAll('.spread-transaction-layer').forEach((el) => {
      if (el.dataset.layerId === layerId) el.classList.add('is-hovered');
    });
    if (!layerId) layer.classList.add('is-hovered');
    transactionTooltipEl.innerHTML = layer.dataset.tooltip || '';
    transactionTooltipEl.hidden = false;
    positionTransactionTooltip(layer);
  }

  function hideTransactionTooltip(layer) {
    if (layer) {
      const layerId = layer.dataset.layerId || '';
      chartEl.querySelectorAll('.spread-transaction-layer').forEach((el) => {
        if (el.dataset.layerId === layerId || !layerId) el.classList.remove('is-hovered');
      });
    }
    transactionTooltipEl.hidden = true;
    transactionTooltipEl.innerHTML = '';
    transactionTooltipEl.style.left = '';
    transactionTooltipEl.style.top = '';
  }

  function renderGraphOnly() {
    if (!payload || !payload.has_data) return;
    const series = orderSeriesForGraph(computeDailySeries());
    const days = payload.window.days;
    const width = 1160;
    const height = 800;
    const pad = { left: 52, right: 16, top: 18, bottom: 42 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const totals = days.map((_, idx) => series.reduce((sum, row) => sum + row.values[idx], 0));
    const budget = effectiveBudgetDaily();
    const budgetDaily = budget.daily;
    const maxTotal = Math.max(1, budgetDaily, ...totals);
    const barWidth = plotW / Math.max(1, days.length);
    const xForDay = (i) => pad.left + i * barWidth;
    const xScale = (i) => xForDay(i) + barWidth / 2;
    const yScale = (value) => pad.top + plotH - (value / maxTotal) * plotH;
    const baseline = new Array(days.length).fill(0);
    const pieces = [
      `<rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="#fbfdff" />`,
      `<line x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" stroke="#cfd8e6" />`,
    ];

    for (const row of series) {
      if (row.hidden) continue;
      for (const tx of row.transactionLayers) {
        pieces.push(...rectsForLayer(xForDay, barWidth, yScale, baseline, tx));
        for (let i = 0; i < baseline.length; i += 1) baseline[i] += tx.values[i];
      }
    }

    if (budgetDaily > 0) {
      const y = yScale(budgetDaily);
      const label = `Budget ${moneyFormat.format(budgetDaily)}/day`;
      const source = budget.overrideCount > 0 ? `, including ${budget.overrideCount} scenario override(s)` : '';
      pieces.push(`<line x1="${pad.left}" y1="${y}" x2="${pad.left + plotW}" y2="${y}" stroke="#111827" stroke-width="2" stroke-dasharray="8 7"><title>${label}${source}</title></line>`);
      pieces.push(`<text x="${pad.left + 8}" y="${Math.max(14, y - 8)}" font-size="12" fill="#111827">${label}</text>`);
    }

    const tickStep = Math.max(1, Math.floor(days.length / 6));
    for (let i = 0; i < days.length; i += tickStep) {
      const x = xScale(i);
      pieces.push(`<text x="${x}" y="${height - 14}" text-anchor="middle" font-size="11" fill="#4f5e73">${days[i].slice(5)}</text>`);
    }
    pieces.push(`<text x="8" y="${pad.top + 12}" font-size="12" fill="#4f5e73">Peak ${moneyFormat.format(Math.max(...totals, 0))}/day</text>`);
    chartEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    chartEl.innerHTML = pieces.join('');

    legendEl.innerHTML = series.map((row) => `<span class="spread-legend-item ${row.hidden ? 'is-muted' : ''}"><span class="spread-color-dot" style="background:${row.color}"></span>${row.category_label}</span>`).join('');
    transactionTooltipEl.hidden = true;
    transactionTooltipEl.innerHTML = '';
    return series;
  }

  function renderChart() {
    const series = renderGraphOnly();
    if (series) renderCategoryControls(series);
  }

  function renderCategoryControls(series) {
    categoryControlsEl.innerHTML = '';
    for (const row of series) {
      const setting = categorySetting(row.category_key);
      const item = document.createElement('div');
      item.className = 'spread-category-row';
      item.innerHTML = `
        <span class="spread-color-dot" style="background:${row.color}"></span>
        <strong>${row.category_label}</strong>
        <span class="fine-print">${moneyFormat.format(row.total_amount_abs)} window / ${moneyFormat.format(row.january_sort_total_abs)} sort-Jan</span>
        <label><input type="checkbox" data-role="hidden" ${setting.hidden ? 'checked' : ''}> Hide</label>
        <label><input type="checkbox" data-role="override" ${setting.override ? 'checked' : ''}> Override</label>
        <select data-role="shape" ${setting.override ? '' : 'disabled'}>
          ${SHAPES.map((shape) => `<option value="${shape}" ${shape === setting.shape ? 'selected' : ''}>${shape}</option>`).join('')}
        </select>
        <label class="spread-days-label">Days <input type="range" min="1" max="60" value="${setting.days}" data-role="days" ${setting.override ? '' : 'disabled'}> <span>${setting.days}</span></label>
      `;
      item.dataset.categoryKey = row.category_key;
      categoryControlsEl.appendChild(item);
    }
  }

  function populateMonths(months) {
    const preferred = endMonthSelect.dataset.preferredMonth;
    endMonthSelect.innerHTML = '';
    for (const month of months) {
      const option = document.createElement('option');
      option.value = month.month_key;
      option.textContent = month.month_key;
      endMonthSelect.appendChild(option);
    }
    if (preferred && months.some((month) => month.month_key === preferred)) {
      endMonthSelect.value = preferred;
    } else if (months.length) {
      endMonthSelect.value = months[months.length - 1].month_key;
    }
  }

  async function loadGraph() {
    setStatus('Loading spread graph data...');
    loadButton.disabled = true;
    try {
      const params = new URLSearchParams();
      if (endMonthSelect.value) params.set('end_month', endMonthSelect.value);
      payload = await fetchJson(`/api/ad-hoc/spread-graph?${params.toString()}`);
      if (!payload.has_data) {
        setStatus('No transaction data available.', 'status-error');
        return;
      }
      populateMonths(payload.available_months);
      endMonthSelect.value = payload.window.end_month;
      cutoffNoteEl.textContent = `Using latest transaction date as today: ${payload.latest_transaction_date}. Showing ${payload.window.from} through ${payload.window.to}, with carry-in transactions loaded from ${payload.window.carry_in_from} so the left edge does not reset to zero. Sort order anchored to ${payload.january_sort.sort_month}.`;
      writeSaved();
      renderChart();
      setStatus(`Loaded ${payload.transactions.length} transactions across ${payload.categories.length} categories.`, 'status-ok');
    } catch (err) {
      setStatus(err.message, 'status-error');
    } finally {
      loadButton.disabled = false;
    }
  }

  defaultDaysInput.addEventListener('input', () => {
    defaultDaysLabel.textContent = defaultDaysInput.value;
    writeSaved();
    renderGraphOnly();
  });
  defaultShapeSelect.addEventListener('change', () => {
    writeSaved();
    renderChart();
  });
  flattenRecurringInput.addEventListener('change', () => {
    writeSaved();
    renderChart();
  });
  loadButton.addEventListener('click', loadGraph);
  endMonthSelect.addEventListener('change', loadGraph);
  categoryControlsEl.addEventListener('input', (event) => {
    const row = event.target.closest('.spread-category-row');
    if (!row) return;
    const categoryKey = row.dataset.categoryKey;
    const override = row.querySelector('[data-role="override"]').checked;
    const hidden = row.querySelector('[data-role="hidden"]').checked;
    const shape = row.querySelector('[data-role="shape"]').value;
    const days = Number(row.querySelector('[data-role="days"]').value) || 7;
    overrides.set(categoryKey, { override, hidden, shape, days });
    row.querySelector('.spread-days-label span').textContent = String(days);
    writeSaved();
    renderGraphOnly();
  });
  categoryControlsEl.addEventListener('change', (event) => {
    const row = event.target.closest('.spread-category-row');
    if (!row) return;
    const enabled = row.querySelector('[data-role="override"]').checked;
    row.querySelector('[data-role="shape"]').disabled = !enabled;
    row.querySelector('[data-role="days"]').disabled = !enabled;
    if (event.target.dataset.role !== 'days') renderChart();
  });
  chartEl.addEventListener('pointerover', (event) => {
    const layer = event.target.closest('.spread-transaction-layer');
    if (!layer) return;
    showTransactionTooltip(layer);
  });
  chartEl.addEventListener('pointerout', (event) => {
    const layer = event.target.closest('.spread-transaction-layer');
    if (!layer) return;
    hideTransactionTooltip(layer);
  });
  chartEl.addEventListener('focusin', (event) => {
    const layer = event.target.closest('.spread-transaction-layer');
    if (!layer) return;
    showTransactionTooltip(layer);
  });
  chartEl.addEventListener('focusout', (event) => {
    const layer = event.target.closest('.spread-transaction-layer');
    if (!layer) return;
    hideTransactionTooltip(layer);
  });

  readSaved();
  defaultDaysLabel.textContent = defaultDaysInput.value;
  loadGraph();
})();
