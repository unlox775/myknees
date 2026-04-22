/**
 * Read-only reconciliation status from the database (no matcher, no writes).
 * Counts pattern-scoped rows on A/B and which A→B links exist today.
 */

const { resolveFormatIdentifier } = require('./resolve-format');
const { loadSideRows, splitIncludeExclude, summarizeIncludePatterns } = require('./transfer-relationship-reconciler');
const { sortTxByDateDesc } = require('./sort-transactions');
const { enrichUnmatchedWithPossibleMatches } = require('./possible-match-sleuth');

/**
 * @param {import('knex').Knex} knex
 * @param {number} relationshipId
 * @param {{ possibleMatchLookupLimit?: number }} [options] when possibleMatchLookupLimit > 0, sleuth other-account rows for the first N unmatched samples
 */
async function getRelationshipDbStatus(knex, relationshipId, options = {}) {
  const rel = await knex('reconciliation_relationships').where({ id: relationshipId }).first();
  if (!rel) throw new Error(`reconciliation_relationships not found: ${relationshipId}`);

  const [accA, accB] = await Promise.all([
    knex('accounts').where({ id: rel.account_a_id }).first(),
    knex('accounts').where({ id: rel.account_b_id }).first(),
  ]);

  const patterns = await knex('reconciliation_relationship_patterns')
    .where({ relationship_id: relationshipId })
    .select('side', 'match_kind', 'pattern', 'exclude');

  const patternsAAll = patterns.filter((p) => p.side === 'a');
  const patternsBAll = patterns.filter((p) => p.side === 'b');
  const aSplit = splitIncludeExclude(patternsAAll);
  const bSplit = splitIncludeExclude(patternsBAll);
  if (!aSplit.include.length || !bSplit.include.length) {
    throw new Error(
      `Relationship ${relationshipId} needs at least one include pattern for side "a" and one for side "b"`
    );
  }

  const formatA = await resolveFormatIdentifier(knex, rel.account_a_id);
  const formatB = await resolveFormatIdentifier(knex, rel.account_b_id);

  const rowsA = await loadSideRows(knex, rel.account_a_id, formatA, aSplit.include, aSplit.exclude);
  const rowsB = await loadSideRows(knex, rel.account_b_id, formatB, bSplit.include, bSplit.exclude);

  const bPatternIds = new Set(rowsB.map((b) => b.id));

  const targetIds = [...new Set(rowsA.map((a) => a.linked_transaction_id).filter(Boolean))];
  const targets = targetIds.length ? await knex('transactions').whereIn('id', targetIds).select('id', 'account_id') : [];
  const targetMap = new Map(targets.map((t) => [t.id, t]));

  const linkedA = [];
  const unmatchedA = [];
  for (const a of rowsA) {
    const t = a.linked_transaction_id ? targetMap.get(a.linked_transaction_id) : null;
    if (t && t.account_id === rel.account_b_id) linkedA.push(a);
    else unmatchedA.push(a);
  }

  const bIdsList = bPatternIds.size ? [...bPatternIds] : [];
  const inbound =
    bIdsList.length === 0
      ? []
      : await knex('transactions')
          .where({ account_id: rel.account_a_id })
          .whereIn('linked_transaction_id', bIdsList)
          .select('linked_transaction_id');
  const bWithInbound = new Set(inbound.map((i) => i.linked_transaction_id));

  const unmatchedB = rowsB.filter((b) => !bWithInbound.has(b.id));

  const toSample = (row) => ({
    id: row.id,
    date: row.date,
    amount: row.amount,
    description: row.description,
    normalized: row.normalized,
  });

  const unmatchedASorted = sortTxByDateDesc(unmatchedA);
  const unmatchedBSorted = sortTxByDateDesc(unmatchedB);

  let unmatchedASamples = unmatchedASorted.map(toSample);
  let unmatchedBSamples = unmatchedBSorted.map(toSample);
  const sleuthLimit = options.possibleMatchLookupLimit ?? 0;
  if (sleuthLimit > 0 && (unmatchedASamples.length || unmatchedBSamples.length)) {
    const tol = Number(rel.amount_tolerance) || 0.01;
    const enriched = await enrichUnmatchedWithPossibleMatches(knex, {
      accountAId: rel.account_a_id,
      accountBId: rel.account_b_id,
      formatA,
      formatB,
      tolerance: tol,
      unmatchedA: unmatchedASamples,
      unmatchedB: unmatchedBSamples,
      lookupLimit: sleuthLimit,
    });
    unmatchedASamples = enriched.unmatchedA;
    unmatchedBSamples = enriched.unmatchedB;
  }

  return {
    relationshipId,
    name: rel.name,
    active: Number(rel.active) !== 0,
    accountAIdentifier: accA ? accA.identifier : '?',
    accountBIdentifier: accB ? accB.identifier : '?',
    includeRulesSummaryA: summarizeIncludePatterns(aSplit.include),
    includeRulesSummaryB: summarizeIncludePatterns(bSplit.include),
    dateSlippageDays: rel.date_slippage_days,
    amountTolerance: rel.amount_tolerance,
    inScopeACount: rowsA.length,
    inScopeBCount: rowsB.length,
    linkedPairCount: linkedA.length,
    unmatchedACount: unmatchedA.length,
    unmatchedBCount: unmatchedB.length,
    unmatchedA: unmatchedASamples,
    unmatchedB: unmatchedBSamples,
  };
}

/**
 * @param {import('knex').Knex} knex
 * @param {{ possibleMatchLookupLimit?: number }} [options]
 */
async function getAllRelationshipDbStatuses(knex, options = {}) {
  const rels = await knex('reconciliation_relationships').select('id').orderBy('id');
  const out = [];
  for (const { id } of rels) {
    out.push(await getRelationshipDbStatus(knex, id, options));
  }
  return out;
}

module.exports = { getRelationshipDbStatus, getAllRelationshipDbStatuses };
