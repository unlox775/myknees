const NAV_ITEMS = [
  {
    key: 'transactions',
    href: '/ad-hoc/transactions',
    label: 'Transactions',
    disabled: false,
  },
  {
    key: 'month-buckets',
    href: '/ad-hoc/month-buckets',
    label: 'Month Buckets',
    disabled: false,
  },
  {
    key: 'category-trends',
    href: '/ad-hoc/category-trends',
    label: 'Category Trends',
    disabled: false,
  },
  {
    key: 'projection',
    href: '/ad-hoc/projection-forecast',
    label: 'Projection API Explorer',
    disabled: false,
  },
  {
    key: 'projection-scenario',
    href: '/ad-hoc/projection-scenario',
    label: 'Six-Month Scenario',
    disabled: false,
  },
  {
    key: 'subscriptions',
    href: '/ad-hoc/recurring-review',
    label: 'Recurring Review',
    disabled: false,
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAdHocHeader(activeNavKey) {
  const linksHtml = NAV_ITEMS.map((item) => {
    const classes = ['ad-hoc-nav-link'];
    if (item.key === activeNavKey) classes.push('is-active');
    if (item.disabled) classes.push('is-disabled');

    const attrs = [
      `class="${classes.join(' ')}"`,
      `href="${escapeHtml(item.href)}"`,
      `data-nav-key="${escapeHtml(item.key)}"`,
    ];

    if (item.disabled) {
      attrs.push('aria-disabled="true"');
      attrs.push('tabindex="-1"');
    }

    return `<a ${attrs.join(' ')}>${escapeHtml(item.label)}</a>`;
  }).join('');

  return `
<header class="ad-hoc-header">
  <div class="ad-hoc-header-title">MyKnees Ad Hoc Interfaces</div>
  <nav class="ad-hoc-nav" aria-label="Ad hoc navigation">
    ${linksHtml}
  </nav>
</header>`;
}

function renderAdHocPage({ title, activeNavKey, bodyHtml, scriptPath, extraScriptPaths = [] }) {
  const scriptPaths = [
    ...(Array.isArray(extraScriptPaths) ? extraScriptPaths : []),
    scriptPath,
  ].filter((value) => value && String(value).trim() !== '');
  const scriptTags = scriptPaths
    .map((src) => `<script src="${escapeHtml(src)}"></script>`)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/ad-hoc/static/ad-hoc.css" />
</head>
<body>
  ${renderAdHocHeader(activeNavKey)}
  ${bodyHtml}
  ${scriptTags}
</body>
</html>`;
}

module.exports = {
  renderAdHocPage,
};
