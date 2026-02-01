#!/usr/bin/env node
/**
 * Rollback all migrations then run latest. Use for a clean schema.
 */

const knex = require('knex');
const path = require('path');
const config = require('../src/config').getKnexConfig();

async function main() {
  const k = knex(config);
  try {
    await k.migrate.rollback(undefined, true);
    console.log('Rolled back all migrations.');
  } catch (e) {
    if (!e.message || !e.message.includes('No migrations')) console.error(e);
  }
  await k.migrate.latest();
  console.log('Migrations up to date.');
  await k.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
