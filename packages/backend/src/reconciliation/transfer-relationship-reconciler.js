/**
 * Type A (transfer) auto-reconciliation between two accounts using
 * reconciliation_relationships + reconciliation_relationship_patterns.
 *
 * Canonical link: rows on account A get transactions.linked_transaction_id → row on account B.
 */

const { getParser } = require('../classification');
const { nowEpoch } = require('../db/dates');
const { resolveFormatIdentifier } = require('./resolve-format');
const { sortTxByDateDesc } = require('./sort-transactions');
const { enrichUnmatchedWithPossibleMatches } = require('./possible-match-sleuth');

/** @param {string} dateStr YYYY-MM-DD */
function dayDiff(dateStrA, dateStrB) {
  const t1 = Date.parse(`${dateStrA}T12:00:00.000Z`);
  const t2 = Date.parse(`${dateStrB}T12:00:00.000Z`);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 9999;
  return Math.abs(Math.round((t2 - t1) / 86400000));
}

/**
 * Same payment: absolute amounts match within tolerance (sign-agnostic).
 * Imports disagree: bank outflow is often negative while the card line is a positive credit, but
 * some feeds store both sides with the same sign; date slippage handles posting-day differences.
 */
function amountsPairable(amountA, amountB, tolerance) {
  const a = Number(amountA);
  const b = Number(amountB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (Math.abs(a) < 1e-9 && Math.abs(b) < 1e-9) return false;
  const magDiff = Math.abs(Math.abs(a) - Math.abs(b));
  return magDiff <= tolerance;
}

/**
 * @param {string} matchKind
 * @param {string} normalized
 * @param {string} raw
 * @param {string} pattern
 */
function patternMatches(matchKind, normalized, raw, pattern) {
  const p = String(pattern || '');
  const n = String(normalized || '');
  const r = String(raw || '');
  switch (matchKind) {
    case 'normalized_equals':
      return n === p;
    case 'normalized_contains':
      return p.length > 0 && n.includes(p);
    case 'raw_contains':
      return p.length > 0 && r.toLowerCase().includes(p.toLowerCase());
    default:
      return false;
  }
}

/**
 * OR of patterns on this side — any match counts.
 * @param {{ match_kind: string, pattern: string }[]} patterns
 */
function sideMatches(patterns, normalized, raw) {
  if (!patterns.length) return false;
  return patterns.some((pat) => patternMatches(pat.match_kind, normalized, raw, pat.pattern));
}

/**
 * @param {{ exclude?: number }[]} patternRows
 */
function splitIncludeExclude(patternRows) {
  const include = patternRows.filter((p) => !Number(p.exclude));
  const exclude = patternRows.filter((p) => Number(p.exclude));
  return { include, exclude };
}

/**
 * Include patterns OR together; exclude patterns remove the row if any matches.
 */
function rowMatchesPatterns(includePatterns, excludePatterns, normalized, raw) {
  if (!includePatterns.length) return false;
  if (!sideMatches(includePatterns, normalized, raw)) return false;
  if (excludePatterns.length > 0 && sideMatches(excludePatterns, normalized, raw)) return false;
  return true;
}

/**
 * Human-readable summary of include rules (for CLI).
 * @param {{ match_kind: string, pattern: string }[]} patterns
 */
function summarizeIncludePatterns(patterns) {
  if (!patterns || !patterns.length) return '(no include rules)';
  return patterns.map((p) => `${p.match_kind} ${JSON.stringify(p.pattern)}`).join('  OR  ');
}

/**
 * @param {import('knex').Knex} knex
 * @param {{ account_a_id: number, account_b_id: number }} rel
 */
async function clearRelationshipLinks(knex, rel) {
  const sub = knex('transactions').select('id').where({ account_id: rel.account_b_id });
  const n = await knex('transactions')
    .where({ account_id: rel.account_a_id })
    .whereIn('linked_transaction_id', sub)
    .update({ linked_transaction_id: null, updated_at: nowEpoch() });
  return n;
}

/**
 * @param {import('knex').Knex} knex
 * @param {number} accountId
 * @param {string} formatId
 * @param {{ match_kind: string, pattern: string, exclude?: number }[]} includePatterns
 * @param {{ match_kind: string, pattern: string, exclude?: number }[]} [excludePatterns]
 */
async function loadSideRows(knex, accountId, formatId, includePatterns, excludePatterns = []) {
  const parser = getParser(formatId);
  if (!parser) throw new Error(`No parser for format: ${formatId}`);

  const rows = await knex('transactions')
    .where({ account_id: accountId })
    .select('id', 'date', 'description', 'amount', 'linked_transaction_id');

  return rows
    .map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      amount: Number(r.amount),
      normalized: parser.normalize(r.description || ''),
      linked_transaction_id: r.linked_transaction_id,
    }))
    .filter((r) =>
      rowMatchesPatterns(includePatterns, excludePatterns, r.normalized, r.description || '')
    );
}

/**
 * @param {import('knex').Knex} knex
 * @param {number} relationshipId
 * @param {{ dryRun?: boolean, force?: boolean, possibleMatchLookupLimit?: number }} [opts]
 */
async function reconcileRelationship(knex, relationshipId, opts = {}) {
  const dryRun = Boolean(opts.dryRun);
  const force = Boolean(opts.force);

  const rel = await knex('reconciliation_relationships').where({ id: relationshipId }).first();
  if (!rel) throw new Error(`reconciliation_relationships not found: ${relationshipId}`);

  const [accA, accB] = await Promise.all([
    knex('accounts').where({ id: rel.account_a_id }).first(),
    knex('accounts').where({ id: rel.account_b_id }).first(),
  ]);
  const accountAIdentifier = accA ? accA.identifier : '?';
  const accountBIdentifier = accB ? accB.identifier : '?';

  const isActive = Number(rel.active) !== 0;
  if (!isActive && !force) {
    const patternsInactive = await knex('reconciliation_relationship_patterns')
      .where({ relationship_id: relationshipId })
      .select('side', 'match_kind', 'pattern', 'exclude');
    const aIn = splitIncludeExclude(patternsInactive.filter((p) => p.side === 'a')).include;
    const bIn = splitIncludeExclude(patternsInactive.filter((p) => p.side === 'b')).include;
    return {
      relationshipId,
      name: rel.name,
      accountAIdentifier,
      accountBIdentifier,
      includeRulesSummaryA: summarizeIncludePatterns(aIn),
      includeRulesSummaryB: summarizeIncludePatterns(bIn),
      dateSlippageDays: Number(rel.date_slippage_days) || 5,
      amountTolerance: Number(rel.amount_tolerance) || 0.01,
      skipped: true,
      reason: 'inactive',
      linked: 0,
      alreadyLinkedBefore: 0,
      ambiguousCount: 0,
      unmatchedACount: 0,
      unmatchedBCount: 0,
      ambiguous: [],
      unmatchedA: [],
      unmatchedB: [],
    };
  }

  if (rel.account_a_id === rel.account_b_id) {
    throw new Error('relationship account_a_id and account_b_id must differ');
  }

  const bAccountTxIds = new Set(
    (await knex('transactions').where({ account_id: rel.account_b_id }).select('id')).map((r) => r.id)
  );

  const bSubCount = knex('transactions').select('id').where({ account_id: rel.account_b_id });
  const [{ count: linkedCountBefore }] = await knex('transactions')
    .where({ account_id: rel.account_a_id })
    .whereIn('linked_transaction_id', bSubCount)
    .count('* as count');
  const alreadyLinkedBefore = Number(linkedCountBefore) || 0;

  let cleared = 0;
  if (force) {
    cleared = await clearRelationshipLinks(knex, rel);
  }

  const patterns = await knex('reconciliation_relationship_patterns')
    .where({ relationship_id: relationshipId })
    .select('side', 'match_kind', 'pattern', 'exclude');

  const patternsAAll = patterns.filter((p) => p.side === 'a');
  const patternsBAll = patterns.filter((p) => p.side === 'b');
  const { include: patternsAIn, exclude: patternsAEx } = splitIncludeExclude(patternsAAll);
  const { include: patternsBIn, exclude: patternsBEx } = splitIncludeExclude(patternsBAll);
  if (!patternsAIn.length || !patternsBIn.length) {
    throw new Error(
      `Relationship ${relationshipId} needs at least one **include** (exclude=0) pattern for side "a" and one for side "b"`
    );
  }

  const formatA = await resolveFormatIdentifier(knex, rel.account_a_id);
  const formatB = await resolveFormatIdentifier(knex, rel.account_b_id);

  const rowsA = await loadSideRows(knex, rel.account_a_id, formatA, patternsAIn, patternsAEx);
  const rowsB = await loadSideRows(knex, rel.account_b_id, formatB, patternsBIn, patternsBEx);

  const bIds = new Set(rowsB.map((r) => r.id));
  const slippage = Number(rel.date_slippage_days) || 5;
  const tolerance = Number(rel.amount_tolerance) || 0.01;

  /** B-side rows on account B already targeted by some A row (any description). */
  const usedB = new Set();
  const existingLinks = await knex('transactions')
    .where({ account_id: rel.account_a_id })
    .whereNotNull('linked_transaction_id')
    .select('linked_transaction_id');
  for (const { linked_transaction_id: lid } of existingLinks) {
    if (lid && bAccountTxIds.has(lid)) usedB.add(lid);
  }

  const pairs = [];

  const candidatesA = rowsA.filter((a) => {
    if (force) return true;
    if (!a.linked_transaction_id) return true;
    return !bAccountTxIds.has(a.linked_transaction_id);
  });

  for (const a of candidatesA) {
    const candidates = rowsB.filter((b) => {
      if (usedB.has(b.id)) return false;
      if (!amountsPairable(a.amount, b.amount, tolerance)) return false;
      if (dayDiff(a.date, b.date) > slippage) return false;
      return true;
    });

    if (candidates.length === 0) continue;

    // Closest posting date wins; ties (same calendar-day distance) → lower transactions.id (stable 1:1).
    candidates.sort((x, y) => {
      const dx = dayDiff(a.date, x.date) - dayDiff(a.date, y.date);
      if (dx !== 0) return dx;
      return Number(x.id) - Number(y.id);
    });
    const b = candidates[0];
    pairs.push({ aId: a.id, bId: b.id });
    usedB.add(b.id);
  }

  let linked = 0;
  if (!dryRun && pairs.length) {
    const ts = nowEpoch();
    for (const { aId, bId } of pairs) {
      const aRow = await knex('transactions').where({ id: aId }).first();
      const bRow = await knex('transactions').where({ id: bId }).first();
      if (!aRow || !bRow) continue;
      if (aRow.account_id !== rel.account_a_id || bRow.account_id !== rel.account_b_id) continue;
      if (aRow.account_id === bRow.account_id) continue;
      await knex('transactions').where({ id: aId }).update({ linked_transaction_id: bId, updated_at: ts });
      linked++;
    }
  } else if (dryRun) {
    linked = pairs.length;
  }

  const bIdList = bIds.size ? [...bIds] : [-1];
  const linkedFromA = await knex('transactions')
    .where({ account_id: rel.account_a_id })
    .whereNotNull('linked_transaction_id')
    .whereIn('linked_transaction_id', bIdList)
    .select('linked_transaction_id');

  const linkedBFromDb = new Set(linkedFromA.map((r) => r.linked_transaction_id).filter(Boolean));
  for (const { bId } of pairs) linkedBFromDb.add(bId);

  const aIds = rowsA.map((r) => r.id);
  /** Effective A→B link after this run (dry-run simulates pairs without writing). */
  const effectiveALink = new Map();
  for (const a of rowsA) effectiveALink.set(a.id, a.linked_transaction_id);
  if (dryRun) {
    for (const { aId, bId } of pairs) effectiveALink.set(aId, bId);
  } else if (aIds.length) {
    const aLinkRows = await knex('transactions').whereIn('id', aIds).select('id', 'linked_transaction_id');
    for (const r of aLinkRows) effectiveALink.set(r.id, r.linked_transaction_id);
  }

  const unmatchedA = [];
  for (const a of rowsA) {
    const lid = effectiveALink.get(a.id);
    if (lid && bAccountTxIds.has(lid)) continue;
    unmatchedA.push({
      id: a.id,
      date: a.date,
      amount: a.amount,
      description: a.description,
      normalized: a.normalized,
    });
  }

  const unmatchedB = [];
  for (const b of rowsB) {
    if (linkedBFromDb.has(b.id)) continue;
    unmatchedB.push({
      id: b.id,
      date: b.date,
      amount: b.amount,
      description: b.description,
      normalized: b.normalized,
    });
  }

  await knex('reconciliation_relationships')
    .where({ id: relationshipId })
    .update({ updated_at: nowEpoch() });

  const unmatchedASorted = sortTxByDateDesc(unmatchedA);
  const unmatchedBSorted = sortTxByDateDesc(unmatchedB);
  const ambiguousSorted = [];

  const sleuthLimit = opts.possibleMatchLookupLimit ?? 0;
  let unmatchedAOut = unmatchedASorted;
  let unmatchedBOut = unmatchedBSorted;
  if (sleuthLimit > 0 && (unmatchedAOut.length || unmatchedBOut.length)) {
    const enriched = await enrichUnmatchedWithPossibleMatches(knex, {
      accountAId: rel.account_a_id,
      accountBId: rel.account_b_id,
      formatA,
      formatB,
      tolerance,
      unmatchedA: unmatchedAOut,
      unmatchedB: unmatchedBOut,
      lookupLimit: sleuthLimit,
    });
    unmatchedAOut = enriched.unmatchedA;
    unmatchedBOut = enriched.unmatchedB;
  }

  return {
    relationshipId,
    name: rel.name,
    accountAIdentifier,
    accountBIdentifier,
    includeRulesSummaryA: summarizeIncludePatterns(patternsAIn),
    includeRulesSummaryB: summarizeIncludePatterns(patternsBIn),
    dateSlippageDays: slippage,
    amountTolerance: tolerance,
    dryRun,
    force,
    cleared,
    alreadyLinkedBefore,
    formatA,
    formatB,
    linked,
    pairs: dryRun ? pairs : undefined,
    ambiguousCount: ambiguousSorted.length,
    ambiguous: ambiguousSorted,
    unmatchedACount: unmatchedASorted.length,
    unmatchedA: unmatchedAOut,
    unmatchedBCount: unmatchedBSorted.length,
    unmatchedB: unmatchedBOut,
  };
}

/**
 * @param {import('knex').Knex} knex
 * @param {number[]} accountIds
 */
async function runReconcileForAccounts(knex, accountIds) {
  if (!accountIds.length) return { ran: [], summary: { linked: 0, relationships: 0 } };
  const set = new Set(accountIds);
  const rels = await knex('reconciliation_relationships').where({ active: 1 }).select('id');
  const ran = [];
  let linked = 0;
  for (const { id } of rels) {
    const rel = await knex('reconciliation_relationships').where({ id }).first();
    if (!rel) continue;
    if (!set.has(rel.account_a_id) && !set.has(rel.account_b_id)) continue;
    const r = await reconcileRelationship(knex, id, { dryRun: false, force: false });
    ran.push(r);
    linked += r.linked;
  }
  return { ran, summary: { linked, relationships: ran.length } };
}

module.exports = {
  patternMatches,
  amountsPairable,
  clearRelationshipLinks,
  reconcileRelationship,
  runReconcileForAccounts,
  loadSideRows,
  splitIncludeExclude,
  rowMatchesPatterns,
  summarizeIncludePatterns,
};
