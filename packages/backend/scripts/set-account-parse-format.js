#!/usr/bin/env node
/**
 * Set accounts.parse_format_id and seed classification rows for every distinct
 * transaction description on that account (for the chosen format).
 *
 *   node scripts/set-account-parse-format.js --account=Chase_VISA --parse-format=chase_visa
 *
 * Does not modify other agents’ migrations. Run migrate first so accounts.parse_format_id exists.
 * Then: npm run recompute-normalized
 */

const { getKnex } = require('../src/db/knex');
const { upsertClassificationForRaw } = require('../src/classification/upsert-classification');
const { nowEpoch } = require('../src/db/dates');

function getArg(name) {
  const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=').slice(1).join('=').trim();
  return null;
}

async function main() {
  const accountArg = getArg('account');
  const formatArg = getArg('parse-format');
  if (!accountArg || !formatArg) {
    console.error('Usage: node scripts/set-account-parse-format.js --account=Chase_VISA --parse-format=chase_visa');
    process.exit(1);
  }

  const knex = getKnex();
  const account = await knex('accounts').where({ identifier: accountArg }).first();
  if (!account) {
    console.error('Account not found:', accountArg);
    process.exit(1);
  }
  const pf = await knex('parse_formats').where({ identifier: formatArg }).first();
  if (!pf) {
    console.error('parse_formats not found:', formatArg);
    process.exit(1);
  }

  const ts = nowEpoch();
  await knex('accounts').where({ id: account.id }).update({ parse_format_id: pf.id, updated_at: ts });

  const rows = await knex('transactions').where({ account_id: account.id }).select('description');
  const distinct = [...new Set(rows.map((r) => String(r.description || '').trim()).filter(Boolean))];

  let insertedRaw = 0;
  let insertedNorm = 0;
  let updatedNorm = 0;
  for (const rawValue of distinct) {
    const r = await upsertClassificationForRaw(knex, formatArg, rawValue, ts);
    if (r.insertedRaw) insertedRaw++;
    if (r.insertedNorm) insertedNorm++;
    if (r.updatedNorm) updatedNorm++;
  }

  console.log(
    'Account',
    account.identifier,
    '→ parse_format',
    formatArg,
    '| distinct descriptions',
    distinct.length,
    '| new raw',
    insertedRaw,
    '| new norm',
    insertedNorm,
    '| norm drift',
    updatedNorm
  );
  console.log('Next: npm run recompute-normalized');
  await knex.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
