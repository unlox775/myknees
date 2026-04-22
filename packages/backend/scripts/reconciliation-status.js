#!/usr/bin/env node
/**
 * Read-only: current transfer reconciliation status from the database.
 * Does NOT run the matcher or write links — use npm run reconcile:transfers for that.
 *
 * With no arguments, defaults to --all (every relationship).
 *
 *   node scripts/reconciliation-status.js
 *   node scripts/reconciliation-status.js --all
 *   node scripts/reconciliation-status.js --relationship=1
 *   node scripts/reconciliation-status.js --relationship=1 --sample=20
 *   node scripts/reconciliation-status.js --all --strict   (exit 1 if any gaps)
 *   node scripts/reconciliation-status.js --relationship=1 --no-sleuth   (skip cross-account amount/date hints)
 *
 * With --json, prints one JSON object per line (no colors).
 */

const { getKnex } = require('../src/db/knex');
const {
  getRelationshipDbStatus,
  getAllRelationshipDbStatuses,
} = require('../src/reconciliation/relationship-status');
const { formatDbStatusHuman } = require('../src/reconciliation/cli-output');

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
  let all = hasFlag('all');
  const scopedRel = process.argv.some((a) => a.startsWith('--relationship=') || a === '--relationship');
  if (!scopedRel && !all) all = true;
  const strict = hasFlag('strict');
  const json = hasFlag('json');
  const noSleuth = hasFlag('no-sleuth') || process.env.MYKNEES_RECONCILE_NO_SLEUTH === '1';
  const sampleLimit = Math.max(0, parseInt(getArg('sample') || '15', 10) || 15);
  const sleuthOpts = { possibleMatchLookupLimit: json || noSleuth ? 0 : sampleLimit };

  let anyGaps = false;
  try {
    if (all) {
      const rows = await getAllRelationshipDbStatuses(knex, sleuthOpts);
      for (const s of rows) {
        if (s.unmatchedACount + s.unmatchedBCount > 0) anyGaps = true;
        if (json) console.log(JSON.stringify(s));
        else process.stdout.write(formatDbStatusHuman(s, sampleLimit));
      }
      if (!json && rows.length === 0) console.log('No reconciliation_relationships rows.');
    } else if (idArg) {
      const id = parseInt(idArg, 10);
      if (Number.isNaN(id)) {
        console.error('Invalid --relationship');
        process.exit(1);
      }
      const s = await getRelationshipDbStatus(knex, id, sleuthOpts);
      if (s.unmatchedACount + s.unmatchedBCount > 0) anyGaps = true;
      if (json) console.log(JSON.stringify(s, null, 2));
      else process.stdout.write(formatDbStatusHuman(s, sampleLimit));
    } else {
      console.error(
        'Usage: [--relationship=<id>] | [--all]   (default: --all)   [--sample=15] [--strict] [--json] [--no-sleuth]'
      );
      process.exit(1);
    }

    if (strict && anyGaps) process.exit(1);
  } finally {
    await knex.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
