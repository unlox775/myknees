#!/usr/bin/env node
/**
 * Add an account (bare minimum: identifier, optional name and type).
 * Use this instead of seeding so you can add accounts on demand; multiple
 * accounts can share the same import format (e.g. two Ally-format accounts).
 *
 * Usage:
 *   node scripts/add-account.js --identifier=Ally_Bank
 *   node scripts/add-account.js --identifier=Ally_Bank --name="Ally Bank" --type=bank
 *   node scripts/add-account.js --identifier=Capital_One --name="Capital One" --type=credit_card
 *
 * --identifier  Required. Unique slug (e.g. Ally_Bank, Capital_One).
 * --name        Optional. Display name (default: identifier with underscores → spaces).
 * --type        Optional. bank | credit_card | cash (default: bank).
 * --debug       Optional. Print DB path, DATA_STORE_ROOT, resolved root, schema note.
 */

const { getKnex } = require('../src/db/knex');
const { getKnexConfig, getMykneesRoot } = require('../src/config');
const accounts = require('../src/repositories/accounts');

function parseArgs() {
  const args = process.argv.slice(2);
  const identifier = args.find((a) => a.startsWith('--identifier='))?.split('=')[1]?.trim();
  const name = args.find((a) => a.startsWith('--name='))?.split('=')[1]?.trim();
  const type = args.find((a) => a.startsWith('--type='))?.split('=')[1]?.trim();
  const debug = args.includes('--debug');
  return { identifier, name, type, debug };
}

function printDebugStderr(cfg) {
  console.error('[debug] DB path:', cfg.client === 'better-sqlite3' && cfg.connection?.filename ? cfg.connection.filename : '(not SQLite file)');
  console.error('[debug] client:', cfg.client);
  if (cfg.client === 'better-sqlite3') {
    try {
      const root = getMykneesRoot();
      console.error('[debug] DATA_STORE_ROOT:', process.env.DATA_STORE_ROOT ?? '(not set, using ~/.myknees/backend)');
      console.error('[debug] resolved data root:', root);
      console.error('[debug] SQLite schema: main (single file = one schema; no schema selection)');
    } catch (e) {
      console.error('[debug] getMykneesRoot:', e.message);
    }
  }
  console.error('[debug] HOME:', process.env.HOME ?? process.env.USERPROFILE ?? '(unset)');
}

async function main() {
  const cfg = getKnexConfig();
  if (cfg.client === 'better-sqlite3' && cfg.connection?.filename) {
    console.error('DB:', cfg.connection.filename);
  }
  const { identifier, name, type, debug } = parseArgs();
  if (debug) printDebugStderr(cfg);
  if (!identifier) {
    console.error('Usage: node scripts/add-account.js --identifier=Ally_Bank [--name="Ally Bank"] [--type=bank]');
    process.exit(1);
  }
  const allowedTypes = ['bank', 'credit_card', 'cash'];
  if (type && !allowedTypes.includes(type)) {
    console.error('type must be one of:', allowedTypes.join(', '));
    process.exit(1);
  }

  const knex = getKnex();
  const existing = await accounts.findByIdentifier(identifier);
  if (existing) {
    console.log('Account already exists:', existing.id, existing.identifier, existing.name, existing.type);
    await knex.destroy();
    return;
  }

  const displayName = name || identifier.replace(/_/g, ' ');
  const account = await accounts.create({
    identifier,
    name: displayName,
    type: type || 'bank',
  });
  console.log('Created account:', account.id, account.identifier, account.name, account.type);
  await knex.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
