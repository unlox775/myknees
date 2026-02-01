/**
 * Initial schema: accounts, transactions, line_items.
 * Portable for SQLite and PostgreSQL (knex schema builder).
 *
 * Timestamps: created_at/updated_at = timestamp with time zone (intent).
 * Stored as REAL (epoch seconds with fractional part) for portability and
 * sub-second accuracy. Transaction date is date-only: Postgres DATE,
 * SQLite date/text YYYY-MM-DD.
 */

exports.up = function (knex) {
  return knex.schema
    .createTable('accounts', (t) => {
      t.increments('id').primary();
      t.text('identifier').notNullable().unique();
      t.text('name').notNullable();
      t.text('type').notNullable(); // bank | credit_card | cash
      t.float('created_at').notNullable(); // epoch seconds (fractional); intent: timestamptz
      t.float('updated_at').notNullable();
    })
    .then(() =>
      knex.schema.createTable('transactions', (t) => {
        t.increments('id').primary();
        t.integer('account_id').unsigned().notNullable();
        t.foreign('account_id').references('id').inTable('accounts');
        t.date('date').notNullable(); // date only; Postgres DATE, SQLite YYYY-MM-DD
        t.text('description');
        t.real('amount').notNullable();
        t.text('source_category');
        t.text('source_subcategory');
        t.text('category');
        t.text('subcategory');
        t.text('transaction_type');
        t.integer('linked_transaction_id').unsigned();
        t.foreign('linked_transaction_id').references('id').inTable('transactions');
        t.float('created_at').notNullable(); // epoch seconds (fractional); intent: timestamptz
        t.float('updated_at').notNullable();
      })
    )
    .then(() =>
      knex.schema.createTable('line_items', (t) => {
        t.increments('id').primary();
        t.integer('transaction_id').unsigned().notNullable();
        t.foreign('transaction_id').references('id').inTable('transactions');
        t.text('description');
        t.real('amount').notNullable();
        t.text('category');
        t.text('subcategory');
        t.integer('linked_transaction_id').unsigned();
        t.foreign('linked_transaction_id').references('id').inTable('transactions');
        t.integer('linked_line_item_id').unsigned();
        t.foreign('linked_line_item_id').references('id').inTable('line_items');
        t.float('created_at').notNullable(); // epoch seconds (fractional); intent: timestamptz
        t.float('updated_at').notNullable();
      })
    );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('line_items')
    .then(() => knex.schema.dropTableIfExists('transactions'))
    .then(() => knex.schema.dropTableIfExists('accounts'));
};
