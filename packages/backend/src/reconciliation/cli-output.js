/**
 * Human-readable CLI output for transfer reconciliation (colors when TTY).
 */

function green(s) {
  return process.stdout.isTTY ? `\x1b[32m${s}\x1b[0m` : s;
}

function red(s) {
  return process.stdout.isTTY ? `\x1b[31m${s}\x1b[0m` : s;
}

function dim(s) {
  return process.stdout.isTTY ? `\x1b[90m${s}\x1b[0m` : s;
}

function bold(s) {
  return process.stdout.isTTY ? `\x1b[1m${s}\x1b[0m` : s;
}

function truncate(s, max) {
  const t = String(s || '');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Dimmed “ (raw …)” after normalized, for sanity-checking the parser. Empty if no description.
 * @param {string|null|undefined} description
 * @param {number} maxRaw
 */
function rawDescriptionParen(description, maxRaw) {
  const raw = String(description || '').trim();
  if (!raw) return '';
  return dim(` (${truncate(raw, maxRaw)})`);
}

/**
 * @param {{ date: string, amount: number, id: number, description?: string|null, normalized?: string|null, possibleMatch?: { id: number, date: string, amount: number, description?: string|null, normalized?: string|null } }[]} rows
 * @param {number} limit
 * @param {number} [relationshipId] for the “full list” tip
 * @param {{ maxRawInParens?: number }} [opts] MYKNEES_RECONCILE_RAW_PARENS_MAX=N overrides max chars of bank text in parentheses (default 100). MYKNEES_RECONCILE_NO_RAW_PARENS=1 omits parentheses.
 */
function formatSampleBlock(rows, limit, relationshipId, opts = {}) {
  const rid = relationshipId != null ? String(relationshipId) : '1';
  const envMax = parseInt(process.env.MYKNEES_RECONCILE_RAW_PARENS_MAX || '', 10);
  const maxRaw = Number.isFinite(envMax) && envMax > 0 ? envMax : opts.maxRawInParens ?? 100;
  const omitParens = process.env.MYKNEES_RECONCILE_NO_RAW_PARENS === '1';
  if (!rows.length) return `  ${dim('(none)')}\n`;
  const n = Math.min(Math.max(0, limit), rows.length);
  let s = '';
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    const norm = truncate(String(r.normalized || '').trim() || '(missing normalized)', 200);
    const parens = omitParens ? '' : rawDescriptionParen(r.description, maxRaw);
    s += `  ${r.date}  ${r.amount}\tid ${r.id}\t${norm}${parens}\n`;
    if (r.possibleMatch) {
      const pm = r.possibleMatch;
      const desc = truncate(String(pm.description || ''), 120);
      const normHint =
        pm.normalized != null && String(pm.normalized).trim() !== ''
          ? `  [normalized: ${truncate(String(pm.normalized), 90)}]`
          : '';
      s += dim(
        `      --→ possible match (other account): ${pm.date}  ${pm.amount}  ${desc}  id ${pm.id}${normHint}`
      );
      s += '\n';
    }
  }
  if (rows.length > n) {
    s += dim(
      `  … and ${rows.length - n} more (save full lists: npm run reconcile:report -- --relationship=${rid})\n`
    );
  }
  return s;
}

function sideLegend(aLabel, bLabel) {
  return [
    bold('Which account is which?'),
    `  Side A — ${aLabel}  (bank / fund: money leaving to pay the card). The link is stored on these rows.`,
    `  Side B — ${bLabel}  (card: payment / credit lines on the card). We point each A row at one B row.`,
    '',
  ].join('\n');
}

function formatMatchingExplainer() {
  return [
    bold('What is actually being matched?'),
    dim(
      '  For each row we read the description from the DB, run that account’s parser (ally_bank, capital_one, …), and compare the resulting normalized string to the include rules in reconciliation_relationship_patterns.'
    ),
    dim(
      '  Each sample line shows the normalized string (what rules match), then dimmed parentheses with the stored bank/importer description so you can spot over-broad parsers. With normalized_equals, every in-scope row should share one normalized phrase unless you intentionally split buckets.'
    ),
    '',
  ].join('\n');
}

/**
 * @param {string} sideLabel
 * @param {{ normalized?: string }[]} rows
 * @param {number} sampleLimit
 */
function formatDistinctNormalizedWarning(sideLabel, rows, sampleLimit) {
  const n = Math.min(Math.max(0, sampleLimit), rows.length);
  const slice = rows.slice(0, n);
  const set = new Set(slice.map((r) => r.normalized).filter(Boolean));
  if (set.size <= 1) return '';
  const vals = [...set].map((x) => JSON.stringify(x)).join(', ');
  return (
    dim(
      `  Heads-up (${sideLabel}): first ${n} samples show ${set.size} different normalized values: ${vals}. Rules still apply per row; tighten parsers if you want a single canonical phrase.`
    ) + '\n\n'
  );
}

/**
 * @param {string} summaryA
 * @param {string} summaryB
 * @param {number|string|null|undefined} dateSlippageDays from reconciliation_relationships (default ±5 days)
 * @param {number|string|null|undefined} amountTolerance from reconciliation_relationships (default 0.01)
 */
function formatIncludeRulesBlock(summaryA, summaryB, dateSlippageDays, amountTolerance) {
  const slip =
    dateSlippageDays != null && dateSlippageDays !== ''
      ? Number(dateSlippageDays)
      : Number.NaN;
  const tol =
    amountTolerance != null && amountTolerance !== ''
      ? Number(amountTolerance)
      : Number.NaN;
  const slipN = Number.isFinite(slip) ? slip : 5;
  const tolN = Number.isFinite(tol) ? tol : 0.01;
  return [
    bold('Include rules from the database (what we compare against)'),
    dim(`  Side A: ${summaryA || '—'}`),
    dim(`  Side B: ${summaryB || '—'}`),
    dim(
      `  Matcher: pair when |amount A| and |amount B| differ by ≤ ${tolN} (amount_tolerance), and posted dates are within ±${slipN} calendar days (date_slippage_days). “id N” is this row’s primary key in the transactions table (not from your bank statement).`
    ),
    '',
  ].join('\n');
}

/**
 * @param {object} r reconcileRelationship() result
 * @param {number} sampleLimit
 */
function formatReconcileRunHuman(r, sampleLimit) {
  if (r.skipped) {
    const lines = [
      dim(`Relationship ${r.relationshipId} (${r.name || ''}) — skipped (${r.reason}).`),
      '',
    ];
    if (r.includeRulesSummaryA != null || r.includeRulesSummaryB != null) {
      lines.push(
        formatMatchingExplainer(),
        formatIncludeRulesBlock(
          r.includeRulesSummaryA,
          r.includeRulesSummaryB,
          r.dateSlippageDays,
          r.amountTolerance
        ),
        dim('  The matcher did not run on this skip. For inactive relationships, add --force to run anyway.'),
        ''
      );
    }
    return lines.join('\n');
  }

  const aLabel = r.accountAIdentifier || 'side A';
  const bLabel = r.accountBIdentifier || 'side B';
  const rid = r.relationshipId;
  const gaps = r.unmatchedACount + r.unmatchedBCount + (r.ambiguousCount || 0) > 0;

  const ranMatcher = r.dryRun ? 'Dry run: nothing was written to the database.' : 'Saved any new pairs to the database.';

  const summaryLines = [];
  if (r.dryRun) {
    summaryLines.push(`  ${ranMatcher}`);
    summaryLines.push(
      `  If it had been a real run, it would have added about ${r.linked} new pair(s) (see “would link” logic).`
    );
  } else {
    summaryLines.push(`  ${ranMatcher}`);
    summaryLines.push(`  New pairs added this run: ${r.linked}.`);
    summaryLines.push(`  Pairs that were already saved before this run: ${r.alreadyLinkedBefore ?? 0}.`);
    if ((r.cleared ?? 0) > 0) {
      summaryLines.push(`  Pairs cleared first (--force), then re-matched: ${r.cleared} cleared.`);
    }
    if (r.linked === 0 && (r.alreadyLinkedBefore ?? 0) > 0) {
      summaryLines.push(
        dim(
          '  When “new pairs = 0” but you already have saved pairs: the matcher still ran; it did not find any extra rows it could match safely (rules, dates, amounts, or another bank paid the card).'
        )
      );
    }
  }

  const headline = gaps
    ? red('Still some rows that do not pair up') + ' (see lists below).'
    : green('Every row in scope is paired up.') + ' Nothing left to match under the current rules.';

  const lines = [
    bold(`Transfer pairing: ${r.name || `relationship ${rid}`}`),
    '',
    sideLegend(aLabel, bLabel),
    formatMatchingExplainer(),
    formatIncludeRulesBlock(
      r.includeRulesSummaryA,
      r.includeRulesSummaryB,
      r.dateSlippageDays,
      r.amountTolerance
    ),
    dim(
      `  Sample lists: up to ${sampleLimit} rows each, newest date first — normalized plus dimmed (raw). Same sample count gets a cross-account sleuth (±MYKNEES_RECONCILE_SLEUTH_DAYS or 2 days, same |amount|). MYKNEES_RECONCILE_NO_RAW_PARENS=1 hides raw parentheses; MYKNEES_RECONCILE_RAW_PARENS_MAX=200 lengthens them.`
    ),
    '',
    headline,
    '',
    bold('What this run did'),
    ...summaryLines,
    '',
    `  Rows where the matcher saw more than one possible card line and skipped (to stay safe): ${r.ambiguousCount ?? 0}`,
    '',
    bold(`Rows on ${aLabel} (side A) that still need a matching line on ${bLabel} (side B)`),
    dim(`  (${r.unmatchedACount} total — same idea as “bank payment with no matching card line”)`),
    formatDistinctNormalizedWarning(`${aLabel} (side A)`, r.unmatchedA || [], sampleLimit),
    formatSampleBlock(r.unmatchedA || [], sampleLimit, rid),
    '',
    bold(`Rows on ${bLabel} (side B) that still need a bank line on ${aLabel} (side A) pointing at them`),
    dim(
      `  (${r.unmatchedBCount} total — no side-A row in this pairing linked here after amount + date rules, or the payment came from another account)`
    ),
    formatDistinctNormalizedWarning(`${bLabel} (side B)`, r.unmatchedB || [], sampleLimit),
    formatSampleBlock(r.unmatchedB || [], sampleLimit, rid),
    '',
  ];

  if ((r.ambiguousCount || 0) > 0 && r.ambiguous && r.ambiguous.length) {
    lines.push(dim('Examples where more than one card line could match (none linked automatically):'));
    const amb = r.ambiguous.slice(0, Math.min(3, r.ambiguous.length));
    for (const x of amb) {
      const norm = x.normalizedA ? ` norm=${JSON.stringify(truncate(x.normalizedA, 120))}` : '';
      lines.push(
        `  Side A row #${x.transactionAId} (${x.dateA}, ${x.amountA})${norm} — could match card rows: ${(x.candidateBIds || []).join(', ')}`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * @param {object} s getRelationshipDbStatus() result
 * @param {number} sampleLimit
 */
function formatDbStatusHuman(s, sampleLimit) {
  const aLabel = s.accountAIdentifier || 'side A';
  const bLabel = s.accountBIdentifier || 'side B';
  const rid = s.relationshipId;
  const gaps = s.unmatchedACount + s.unmatchedBCount > 0;

  const headline = gaps
    ? red('There are still unpaired rows') + ' (same lists as after a transfer run, but this command did not change anything).'
    : green('All rows in scope are already paired.') + ' Nothing missing under the current rules.';

  return [
    bold(`Current pairing status (read-only): ${s.name}`),
    '',
    sideLegend(aLabel, bLabel),
    formatMatchingExplainer(),
    formatIncludeRulesBlock(
      s.includeRulesSummaryA,
      s.includeRulesSummaryB,
      s.dateSlippageDays,
      s.amountTolerance
    ),
    dim(
      `  Sample lists: up to ${sampleLimit} rows each, newest date first — normalized plus dimmed (raw). Same sample count gets a cross-account sleuth (±MYKNEES_RECONCILE_SLEUTH_DAYS or 2 days, same |amount|). MYKNEES_RECONCILE_NO_RAW_PARENS=1 hides raw parentheses; MYKNEES_RECONCILE_RAW_PARENS_MAX=200 lengthens them.`
    ),
    '',
    headline,
    '',
    `  Relationship is ${s.active ? 'on' : 'off'} for automatic runs after import.`,
    `  Rows we look at on ${aLabel} (side A, by description rules): ${s.inScopeACount}`,
    `  Rows we look at on ${bLabel} (side B, by description rules): ${s.inScopeBCount}`,
    `  Pairs already saved (${aLabel} → ${bLabel}): ${s.linkedPairCount}`,
    '',
    bold(`Still unpaired on ${aLabel} (side A)`),
    dim(`  (${s.unmatchedACount} — bank-side payment with no saved link to a card line)`),
    formatDistinctNormalizedWarning(`${aLabel} (side A)`, s.unmatchedA || [], sampleLimit),
    formatSampleBlock(s.unmatchedA || [], sampleLimit, rid),
    '',
    bold(`Still unpaired on ${bLabel} (side B)`),
    dim(`  (${s.unmatchedBCount} — card line with no bank row pointing at it)`),
    formatDistinctNormalizedWarning(`${bLabel} (side B)`, s.unmatchedB || [], sampleLimit),
    formatSampleBlock(s.unmatchedB || [], sampleLimit, rid),
    dim(`  To try to create more links: npm run reconcile:transfers -- --relationship=${rid}`),
    '',
  ].join('\n');
}

module.exports = {
  formatReconcileRunHuman,
  formatDbStatusHuman,
  green,
  red,
  truncate,
};
