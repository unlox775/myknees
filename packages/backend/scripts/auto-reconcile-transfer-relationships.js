#!/usr/bin/env node
/**
 * Attempt transfer reconciliation (writes links): set transactions.linked_transaction_id
 * on account A → matching row on account B.
 *
 * For read-only status (no matcher, no writes): npm run reconcile:status
 *
 *   node scripts/auto-reconcile-transfer-relationships.js --all
 *   node scripts/auto-reconcile-transfer-relationships.js --relationship=1
 *   node scripts/auto-reconcile-transfer-relationships.js --relationship=1 --dry-run
 *   node scripts/auto-reconcile-transfer-relationships.js --relationship=1 --force
 *
 * --force     Clear existing A→B links for this relationship, then re-match.
 * --dry-run   No DB updates; still shows human summary + samples.
 * --json      Machine-readable only (legacy one-line JSON per relationship with --all).
 * --sample=N  Max sample rows per unmatched list (default 15); lists are newest-first by date.
 * --strict     Exit 1 if any relationship still has unmatched or ambiguous rows after the run.
 * --no-sleuth  Skip cross-account “possible match” hints (same |amount| within ±2 days on the other account).
 */

const { getKnex } = require('../src/db/knex');
const { reconcileRelationship } = require('../src/reconciliation/transfer-relationship-reconciler');
const { formatReconcileRunHuman } = require('../src/reconciliation/cli-output');

function getArg(name) {
  const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=').slice(1).join('=').trim();
  return null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const knex = getKnex();
  const idArg = getArg('relationship');
  const dryRun = hasFlag('dry-run');
  const force = hasFlag('force');
  const all = hasFlag('all');
  const json = hasFlag('json');
  const strict = hasFlag('strict');
  const noSleuth = hasFlag('no-sleuth') || process.env.MYKNEES_RECONCILE_NO_SLEUTH === '1';
  const sampleLimit = Math.max(0, parseInt(getArg('sample') || '15', 10) || 15);
  const reconcileOptsBase = { dryRun, force };
  const sleuthLimit = json || noSleuth ? 0 : sampleLimit;

  let totalLinked = 0;
  let anyGaps = false;
  try {
    if (all) {
      const rels = await knex('reconciliation_relationships').select('id').orderBy('id');
      for (const { id } of rels) {
        const r = await reconcileRelationship(knex, id, {
          ...reconcileOptsBase,
          possibleMatchLookupLimit: sleuthLimit,
        });
        totalLinked += r.linked;
        if ((r.unmatchedACount || 0) + (r.unmatchedBCount || 0) + (r.ambiguousCount || 0) > 0) {
          anyGaps = true;
        }
        if (json) {
          console.log(
            JSON.stringify({
              relationshipId: id,
              linked: r.linked,
              ambiguous: r.ambiguousCount,
              unmatchedA: r.unmatchedACount,
              unmatchedB: r.unmatchedBCount,
              cleared: r.cleared,
            })
          );
        } else {
          process.stdout.write(formatReconcileRunHuman(r, sampleLimit));
        }
      }
      if (!json) {
        console.log(
          dimLine(
            `Finished ${rels.length} relationship(s). New pairs saved this command: ${totalLinked}.`
          )
        );
        if (!anyGaps && rels.length) {
          console.log(
            '\n' +
              (process.stdout.isTTY
                ? '\x1b[32mAll rows in scope are paired — nothing left to match with the current rules.\x1b[0m'
                : 'All rows in scope are paired — nothing left to match with the current rules.') +
              '\n'
          );
        }
      }
    } else if (idArg) {
      const id = parseInt(idArg, 10);
      if (Number.isNaN(id)) {
        console.error('Invalid --relationship');
        process.exit(1);
      }
      const r = await reconcileRelationship(knex, id, {
        ...reconcileOptsBase,
        possibleMatchLookupLimit: sleuthLimit,
      });
      if ((r.unmatchedACount || 0) + (r.unmatchedBCount || 0) + (r.ambiguousCount || 0) > 0) {
        anyGaps = true;
      }
      if (json) console.log(JSON.stringify(r, null, 2));
      else process.stdout.write(formatReconcileRunHuman(r, sampleLimit));
    } else {
      console.error(
        'Usage: --relationship=<id> | --all   [--dry-run] [--force] [--json] [--sample=15] [--strict] [--no-sleuth]'
      );
      process.exit(1);
    }

    if (strict && anyGaps) process.exit(1);
  } finally {
    await knex.destroy();
  }
}

function dimLine(s) {
  return process.stdout.isTTY ? `\x1b[90m${s}\x1b[0m` : s;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
