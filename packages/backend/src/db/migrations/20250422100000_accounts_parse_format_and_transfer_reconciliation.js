/**
 * Adds accounts.parse_format_id (FK → parse_formats) if missing.
 * Transfer reconciliation: configurable account pairs + description patterns,
 * matched by amount (opposite sign / magnitude) and date slippage.
 */

exports.up = async function (knex) {
  const hasParseFormat = await knex.schema.hasColumn('accounts', 'parse_format_id');
  if (!hasParseFormat) {
    await knex.schema.alterTable('accounts', (t) => {
      t.integer('parse_format_id').unsigned().nullable();
      t.foreign('parse_format_id').references('id').inTable('parse_formats');
    });
  }

  const hasRel = await knex.schema.hasTable('reconciliation_relationships');
  if (!hasRel) {
    await knex.schema.createTable('reconciliation_relationships', (t) => {
      t.increments('id').primary();
      t.text('name').notNullable();
      t.integer('account_a_id').unsigned().notNullable();
      t.foreign('account_a_id').references('id').inTable('accounts');
      t.integer('account_b_id').unsigned().notNullable();
      t.foreign('account_b_id').references('id').inTable('accounts');
      /** Max calendar days between paired rows (posting lag). */
      t.integer('date_slippage_days').notNullable().defaultTo(5);
      /** Max | |a| - |b| | for a pair to count as same payment. */
      t.real('amount_tolerance').notNullable().defaultTo(0.01);
      /**
       * Links are stored only on account A: transaction.linked_transaction_id → B.
       * A is typically the funding bank (e.g. Ally); B the card (e.g. Capital One).
       */
      t.integer('active').notNullable().defaultTo(1); // 1 = true (SQLite + Postgres portable)
      t.float('created_at').notNullable();
      t.float('updated_at').notNullable();
    });
  }

  const hasPat = await knex.schema.hasTable('reconciliation_relationship_patterns');
  if (!hasPat) {
    await knex.schema.createTable('reconciliation_relationship_patterns', (t) => {
      t.increments('id').primary();
      t.integer('relationship_id').unsigned().notNullable();
      t.foreign('relationship_id').references('id').inTable('reconciliation_relationships').onDelete('CASCADE');
      /** Which side of the relationship this pattern applies to (account A or B). */
      t.text('side').notNullable(); // 'a' | 'b'
      /**
       * normalized_equals | normalized_contains | raw_contains
       * Normalized uses the same parser as classification for the account's parse_format.
       */
      t.text('match_kind').notNullable();
      t.text('pattern').notNullable();
      t.float('created_at').notNullable();
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('reconciliation_relationship_patterns');
  await knex.schema.dropTableIfExists('reconciliation_relationships');
  const hasParseFormat = await knex.schema.hasColumn('accounts', 'parse_format_id');
  if (hasParseFormat) {
    await knex.schema.alterTable('accounts', (t) => {
      t.dropForeign(['parse_format_id']);
      t.dropColumn('parse_format_id');
    });
  }
};
