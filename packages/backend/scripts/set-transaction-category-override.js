#!/usr/bin/env node
/**
 * Set a per-transaction manual category override.
 *
 * Usage:
 *   node scripts/set-transaction-category-override.js --transaction-id=27439 --category=kids_education
 *   node scripts/set-transaction-category-override.js --transaction-id=27439 --category=kids_education --subcategory=music_in_may_2026
 */

const { getKnex } = require('../src/db/knex');
const { nowEpoch } = require('../src/db/dates');

function getArg(name) {
  const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=').slice(1).join('=').trim();
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1].trim();
  }
  return null;
}

function usageAndExit() {
  console.error(
    'Usage: node scripts/set-transaction-category-override.js --transaction-id=<id> --category=<category> [--subcategory=<subcategory>]'
  );
  process.exit(1);
}

async function main() {
  const idArg = getArg('transaction-id') || getArg('id');
  const categoryArg = getArg('category');
  const subcategoryArg = getArg('subcategory');

  if (!idArg || !/^\d+$/.test(idArg) || !categoryArg || !categoryArg.trim()) {
    usageAndExit();
  }

  const transactionId = Number(idArg);
  const category = categoryArg.trim();
  const ts = nowEpoch();
  const knex = getKnex();

  const before = await knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .where('transactions.id', transactionId)
    .select(
      'transactions.id',
      'transactions.date',
      'transactions.description',
      'transactions.amount',
      'transactions.category',
      'transactions.subcategory',
      'transactions.category_source',
      'accounts.identifier as account_identifier'
    )
    .first();

  if (!before) {
    console.error('Transaction not found:', transactionId);
    process.exit(1);
  }

  const updates = {
    category,
    category_source: 'manual_override',
    updated_at: ts,
  };
  if (subcategoryArg != null) {
    updates.subcategory = subcategoryArg.trim() || null;
  }

  await knex('transactions').where({ id: transactionId }).update(updates);

  const after = await knex('transactions')
    .where({ id: transactionId })
    .select('id', 'date', 'description', 'amount', 'category', 'subcategory', 'category_source')
    .first();

  console.log('Manual override applied.');
  console.log('account:', before.account_identifier);
  console.log('id:', after.id);
  console.log('date:', after.date);
  console.log('amount:', Number(after.amount).toFixed(2));
  console.log('description:', after.description || '');
  console.log(
    'category:',
    `${before.category || '(null)'} -> ${after.category || '(null)'}`
  );
  console.log(
    'subcategory:',
    `${before.subcategory || '(null)'} -> ${after.subcategory || '(null)'}`
  );
  console.log(
    'category_source:',
    `${before.category_source || '(null)'} -> ${after.category_source || '(null)'}`
  );

  await knex.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
