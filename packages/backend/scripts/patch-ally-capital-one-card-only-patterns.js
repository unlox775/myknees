#!/usr/bin/env node
/**
 * Replace fuzzy Ally→Capital One reconciliation patterns with parser-driven canonical phrases:
 *   Ally (A):   normalized_equals  "capital one card payment"
 *   Card (B):   normalized_equals  "capital one card payment received"
 *
 * Also adds optional exclude patterns (auto loan bucket) if you extend them later.
 *
 * Run after: npm run migrate  (adds reconciliation_relationship_patterns.exclude)
 * Then:      npm run recompute-normalized   (optional; matcher uses live parser on descriptions)
 * Then:      npm run reconcile:transfers -- --relationship=<id> --force
 *
 *   node scripts/patch-ally-capital-one-card-only-patterns.js
 *   node scripts/patch-ally-capital-one-card-only-patterns.js --dry-run
 */

const { getKnex } = require('../src/db/knex');
const { nowEpoch } = require('../src/db/dates');

function getArg(name) {
  const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=').slice(1).join('=').trim();
  return null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const idA = getArg('account-a') || 'Ally_Bank';
  const idB = getArg('account-b') || 'Capital_One';
  const knex = getKnex();
  const ts = nowEpoch();

  try {
    const accA = await knex('accounts').where({ identifier: idA }).first();
    const accB = await knex('accounts').where({ identifier: idB }).first();
    if (!accA || !accB) {
      console.error('Accounts not found:', idA, idB);
      process.exit(1);
    }

    const rel = await knex('reconciliation_relationships')
      .where({ account_a_id: accA.id, account_b_id: accB.id })
      .first();

    if (!rel) {
      console.error('No reconciliation_relationships row for', idA, '→', idB);
      process.exit(1);
    }

    const hasExclude = await knex.schema.hasColumn('reconciliation_relationship_patterns', 'exclude');
    if (!hasExclude) {
      console.error('Run migrations first (need reconciliation_relationship_patterns.exclude).');
      process.exit(1);
    }

    const newPatterns = [
      {
        side: 'a',
        match_kind: 'normalized_equals',
        pattern: 'capital one card payment',
        exclude: 0,
      },
      {
        side: 'b',
        match_kind: 'normalized_equals',
        pattern: 'capital one card payment received',
        exclude: 0,
      },
    ];

    if (dryRun) {
      console.log('Would replace patterns for relationship', rel.id, rel.name);
      console.log(JSON.stringify(newPatterns, null, 2));
      await knex.destroy();
      return;
    }

    await knex('reconciliation_relationship_patterns').where({ relationship_id: rel.id }).del();
    await knex('reconciliation_relationship_patterns').insert(
      newPatterns.map((p) => ({
        relationship_id: rel.id,
        side: p.side,
        match_kind: p.match_kind,
        pattern: p.pattern,
        exclude: p.exclude,
        created_at: ts,
      }))
    );

    await knex('reconciliation_relationships')
      .where({ id: rel.id })
      .update({ name: 'Ally Bank → Capital One (credit card only)', updated_at: ts });

    console.log('Patched relationship', rel.id, '|', newPatterns.length, 'patterns (card-only, normalized_equals).');
    console.log('Next: npm run reconcile:transfers -- --relationship=' + rel.id + ' --force');
  } finally {
    await knex.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
