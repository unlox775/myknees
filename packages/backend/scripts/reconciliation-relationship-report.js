#!/usr/bin/env node
/**
 * Write files under data/reconciliation-reports/<timestamp>/ using the same matcher
 * as reconcile:transfers in --dry-run mode (simulated new links + unmatched lists).
 *
 * For a quick read-only view of what is already linked in the DB (no matcher), use:
 *   npm run reconcile:status
 *
 * With no arguments, defaults to --all (every relationship).
 *
 *   node scripts/reconciliation-relationship-report.js
 *   node scripts/reconciliation-relationship-report.js --all
 *   node scripts/reconciliation-relationship-report.js --relationship=1
 *   node scripts/reconciliation-relationship-report.js --relationship=1 --sample=20
 *   node scripts/reconciliation-relationship-report.js --relationship=1 --no-sleuth
 */

const fs = require('fs');
const path = require('path');
const { getKnex } = require('../src/db/knex');
const { reconcileRelationship } = require('../src/reconciliation/transfer-relationship-reconciler');

function getArg(name) {
  const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=').slice(1).join('=').trim();
  return null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function fmtUnmatched(rows) {
  if (!rows.length) return `(none)\n`;
  const envMax = parseInt(process.env.MYKNEES_RECONCILE_RAW_PARENS_MAX || '', 10);
  const maxRaw = Number.isFinite(envMax) && envMax > 0 ? envMax : 100;
  const omit = process.env.MYKNEES_RECONCILE_NO_RAW_PARENS === '1';
  let s = '';
  for (const r of rows) {
    const norm = (r.normalized || '').trim() || '(missing normalized)';
    const raw = String(r.description || '').trim();
    const tail =
      !omit && raw
        ? ` (${raw.length > maxRaw ? `${raw.slice(0, maxRaw - 1)}…` : raw})`
        : '';
    s += `${r.date}\t${r.amount}\tid ${r.id}\t${norm.slice(0, 200)}${tail}\n`;
    if (r.possibleMatch) {
      const pm = r.possibleMatch;
      const d = String(pm.description || '').slice(0, 160);
      const nh = pm.normalized ? ` normalized=${String(pm.normalized).slice(0, 100)}` : '';
      s += `  --> possible match (other account): ${pm.date}\t${pm.amount}\tid ${pm.id}\t${d}${nh}\n`;
    }
  }
  return s;
}

async function main() {
  const knex = getKnex();
  const idArg = getArg('relationship');
  const sampleForSleuth = Math.max(0, parseInt(getArg('sample') || '15', 10) || 15);
  const noSleuth = hasFlag('no-sleuth') || process.env.MYKNEES_RECONCILE_NO_SLEUTH === '1';
  const sleuthLimit = noSleuth ? 0 : sampleForSleuth;
  let all = hasFlag('all');
  const scopedRel = process.argv.some((a) => a.startsWith('--relationship=') || a === '--relationship');
  if (!scopedRel && !all) all = true;
  const outRoot = path.join(__dirname, '..', 'data', 'reconciliation-reports', stamp());
  fs.mkdirSync(outRoot, { recursive: true });

  try {
    const ids = [];
    if (all) {
      const rels = await knex('reconciliation_relationships').select('id').orderBy('id');
      ids.push(...rels.map((r) => r.id));
    } else if (idArg) {
      const id = parseInt(idArg, 10);
      if (Number.isNaN(id)) throw new Error('Invalid --relationship');
      ids.push(id);
    } else {
      throw new Error('Usage: [--relationship=<id>] | [--all]  (default: --all)');
    }

    let summary = '';
    for (const id of ids) {
      const r = await reconcileRelationship(knex, id, {
        dryRun: true,
        force: false,
        possibleMatchLookupLimit: sleuthLimit,
      });
      const body = [
        `Relationship ${id}: ${r.name || ''}`,
        `skipped: ${r.skipped || false}`,
        `alreadyLinkedBefore (A→B, pattern-scoped): ${r.alreadyLinkedBefore ?? 'n/a'}`,
        `wouldLinkNew (dry-run): ${r.linked}`,
        `ambiguous: ${r.ambiguousCount}`,
        `unmatchedA (after simulated pass): ${r.unmatchedACount}`,
        `unmatchedB (after simulated pass): ${r.unmatchedBCount}`,
        '',
        '--- ambiguous ---',
        JSON.stringify(r.ambiguous, null, 2),
        '',
        '--- unmatched A (fund side) ---',
        fmtUnmatched(r.unmatchedA || []),
        '',
        '--- unmatched B (card side) ---',
        fmtUnmatched(r.unmatchedB || []),
        '',
      ].join('\n');

      summary += body + '\n\n';
      fs.writeFileSync(path.join(outRoot, `relationship-${id}.txt`), body, 'utf8');
    }

    fs.writeFileSync(path.join(outRoot, 'summary.txt'), summary, 'utf8');
    console.log('Wrote:', outRoot);
  } finally {
    await knex.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
