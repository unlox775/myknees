#!/usr/bin/env node
/**
 * Create (or skip if exists) a transfer reconciliation relationship:
 * Ally Bank (A, fund) ↔ Capital One (B, card payment credits).
 *
 * Adjust patterns in reconciliation_relationship_patterns if your exports differ.
 *
 *   node scripts/seed-ally-capital-one-relationship.js
 *   node scripts/seed-ally-capital-one-relationship.js --account-a=Ally_Bank --account-b=Capital_One
 */

const { getKnex } = require('../src/db/knex');
const { nowEpoch } = require('../src/db/dates');

function getArg(name) {
  const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=').slice(1).join('=').trim();
  return null;
}

async function main() {
  const knex = getKnex();
  const idA = getArg('account-a') || 'Ally_Bank';
  const idB = getArg('account-b') || 'Capital_One';
  const ts = nowEpoch();

  try {
    const accA = await knex('accounts').where({ identifier: idA }).first();
    const accB = await knex('accounts').where({ identifier: idB }).first();
    if (!accA || !accB) {
      console.error('Need both accounts. Missing:', !accA ? idA : '', !accB ? idB : '');
      process.exit(1);
    }

    const existing = await knex('reconciliation_relationships')
      .where({ account_a_id: accA.id, account_b_id: accB.id })
      .first();

    if (existing) {
      console.log('Relationship already exists id=', existing.id, existing.name);
      await knex.destroy();
      return;
    }

    const ins = await knex('reconciliation_relationships').insert({
      name: 'Ally Bank → Capital One (credit card only)',
      account_a_id: accA.id,
      account_b_id: accB.id,
      date_slippage_days: 5,
      amount_tolerance: 0.01,
      active: 1,
      created_at: ts,
      updated_at: ts,
    });
    const rid = Array.isArray(ins) ? ins[0] : ins;

    /** Tight matching: Ally + Capital One parsers must normalize to these exact strings. */
    const patterns = [
      { side: 'a', match_kind: 'normalized_equals', pattern: 'capital one card payment', exclude: 0 },
      { side: 'b', match_kind: 'normalized_equals', pattern: 'capital one card payment received', exclude: 0 },
    ];

    await knex('reconciliation_relationship_patterns').insert(
      patterns.map((p) => ({
        relationship_id: rid,
        side: p.side,
        match_kind: p.match_kind,
        pattern: p.pattern,
        exclude: p.exclude,
        created_at: ts,
      }))
    );

    console.log('Created reconciliation_relationships id=', rid, '|', accA.identifier, '→', accB.identifier);
    console.log('Run: npm run reconcile:transfers -- --all');
    console.log('Report: npm run reconcile:report -- --relationship=' + rid);
  } finally {
    await knex.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
