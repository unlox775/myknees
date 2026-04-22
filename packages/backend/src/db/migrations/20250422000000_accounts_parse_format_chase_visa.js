/**
 * Optional per-account parse format (normalizer). When null, imports/reports infer format as before.
 * Adds parse_formats row chase_visa (Chase Visa–specific rules on top of Capital One base scrub).
 *
 * SQLite: use ALTER ADD COLUMN only (Knex alterTable rebuild would DROP accounts and break FKs).
 */

const CHASE_VISA = { identifier: 'chase_visa', display_name: 'Chase Visa' };

async function accountsHasColumn(knex, column) {
  const r = await knex.raw('PRAGMA table_info(accounts)');
  const rows = Array.isArray(r) ? r : r[0];
  return Array.isArray(rows) && rows.some((c) => c.name === column);
}

exports.up = async function (knex) {
  const ts = Date.now() / 1000;
  const existing = await knex('parse_formats').where({ identifier: CHASE_VISA.identifier }).first();
  if (!existing) {
    await knex('parse_formats').insert({ ...CHASE_VISA, created_at: ts, updated_at: ts });
  }

  const client = knex.client.config.client;
  if (client === 'better-sqlite3' || client === 'sqlite3') {
    if (!(await accountsHasColumn(knex, 'parse_format_id'))) {
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
    if (await accountsHasColumn(knex, 'parse_format_id')) {
      // SQLite < 3.35: cannot DROP COLUMN; leave orphan column on rollback.
      try {
        await knex.raw('ALTER TABLE accounts DROP COLUMN parse_format_id');
      } catch (_) {
        /* ignore */
      }
    }
  } else {
    await knex.schema.alterTable('accounts', (t) => {
      t.dropForeign(['parse_format_id']);
      t.dropColumn('parse_format_id');
    });
  }
};
