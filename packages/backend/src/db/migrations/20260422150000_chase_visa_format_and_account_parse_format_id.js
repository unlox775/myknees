/**
 * parse_formats.chase_visa + accounts.parse_format_id (nullable FK).
 * Idempotent: skips if chase_visa or parse_format_id already exists (e.g. from 20250422000000 / 20250422100000).
 * SQLite: ADD COLUMN only (no Knex alterTable rebuild of accounts).
 *
 * Kept on disk so Knex stays consistent with knex_migrations if this migration already ran.
 */

const CHASE_VISA = { identifier: 'chase_visa', display_name: 'Chase Visa' };

async function accountsHasColumnSqlite(knex, column) {
  const r = await knex.raw('PRAGMA table_info(accounts)');
  const rows = Array.isArray(r) ? r : r[0];
  return Array.isArray(rows) && rows.some((c) => c.name === column);
}

exports.up = async function (knex) {
  const ts = Date.now() / 1000;
  const existingFmt = await knex('parse_formats').where({ identifier: CHASE_VISA.identifier }).first();
  if (!existingFmt) {
    await knex('parse_formats').insert({ ...CHASE_VISA, created_at: ts, updated_at: ts });
  }

  const client = knex.client.config.client;
  if (client === 'better-sqlite3' || client === 'sqlite3') {
    if (!(await accountsHasColumnSqlite(knex, 'parse_format_id'))) {
      await knex.raw('ALTER TABLE accounts ADD COLUMN parse_format_id INTEGER NULL');
    }
  } else {
    const has = await knex.schema.hasColumn('accounts', 'parse_format_id');
    if (!has) {
      await knex.schema.alterTable('accounts', (t) => {
        t.integer('parse_format_id').unsigned().nullable();
        t.foreign('parse_format_id').references('id').inTable('parse_formats');
      });
    }
  }
};

exports.down = async function (knex) {
  await knex('accounts').update({ parse_format_id: null });
  await knex('parse_formats').where({ identifier: CHASE_VISA.identifier }).del();
  const client = knex.client.config.client;
  if (client === 'better-sqlite3' || client === 'sqlite3') {
    if (await accountsHasColumnSqlite(knex, 'parse_format_id')) {
      try {
        await knex.raw('ALTER TABLE accounts DROP COLUMN parse_format_id');
      } catch (_) {}
    }
  } else {
    const has = await knex.schema.hasColumn('accounts', 'parse_format_id');
    if (has) {
      await knex.schema.alterTable('accounts', (t) => {
        t.dropForeign(['parse_format_id']);
        t.dropColumn('parse_format_id');
      });
    }
  }
};
