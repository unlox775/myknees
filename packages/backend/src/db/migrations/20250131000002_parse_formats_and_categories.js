/**
 * Parse formats (Ally Bank, Capital One, Costco) and category domain.
 * Replaces classification_sources with parse_formats; adds classification_categories (seed);
 * raw_values and mappings keyed by parse_format_id and category_id.
 */

const PARSE_FORMATS = [
  { identifier: 'ally_bank', display_name: 'Ally Bank' },
  { identifier: 'capital_one', display_name: 'Capital One' },
  { identifier: 'costco_receipts', display_name: 'Costco Receipts' },
];

// Standard categories (seed in migration); order matches common usage.
const CATEGORIES = [
  'Bday / Special Day',
  'Bills & Utilities',
  'Cars',
  'Clothing / Hair',
  'Eating Out',
  'Education',
  'Entertainment',
  'Fees & Charges',
  'Food',
  'Home',
  'Income',
  'Insurance',
  'Kids',
  'Medical',
  'Misc',
  'Mortgage & Rent',
  'Retirement',
  'Shopping',
  'Transfer',
  'Travel',
  'Undefined',
  'Vacation',
];

exports.up = function (knex) {
  const ts = Date.now() / 1000;
  return (
    knex.schema
      .dropTableIfExists('classification_overrides')
      .then(() => knex.schema.dropTableIfExists('classification_category_map'))
      .then(() => knex.schema.dropTableIfExists('classification_normalized'))
      .then(() => knex.schema.dropTableIfExists('classification_raw_values'))
      .then(() => knex.schema.dropTableIfExists('classification_sources'))
      .then(() =>
        knex.schema.createTable('parse_formats', (t) => {
          t.increments('id').primary();
          t.text('identifier').notNullable().unique(); // ally_bank, capital_one, costco_receipts
          t.text('display_name');
          t.float('created_at').notNullable();
          t.float('updated_at').notNullable();
        })
      )
      .then(() =>
        knex.schema.createTable('classification_categories', (t) => {
          t.increments('id').primary();
          t.text('name').notNullable().unique();
          t.float('created_at').notNullable();
          t.float('updated_at').notNullable();
        })
      )
      .then(() =>
        knex.schema.createTable('classification_raw_values', (t) => {
          t.increments('id').primary();
          t.integer('parse_format_id').unsigned().notNullable();
          t.foreign('parse_format_id').references('id').inTable('parse_formats');
          t.text('raw_value').notNullable();
          t.unique(['parse_format_id', 'raw_value']);
          t.float('created_at').notNullable();
          t.float('updated_at').notNullable();
        })
      )
      .then(() =>
        knex.schema.createTable('classification_normalized', (t) => {
          t.increments('id').primary();
          t.integer('raw_value_id').unsigned().notNullable();
          t.foreign('raw_value_id').references('id').inTable('classification_raw_values');
          t.text('normalized_value').notNullable();
          t.unique(['raw_value_id']);
          t.float('created_at').notNullable();
          t.float('updated_at').notNullable();
        })
      )
      .then(() =>
        knex.schema.createTable('classification_mappings', (t) => {
          t.increments('id').primary();
          t.integer('parse_format_id').unsigned().notNullable();
          t.foreign('parse_format_id').references('id').inTable('parse_formats');
          t.text('normalized_value').notNullable();
          t.integer('category_id').unsigned().notNullable();
          t.foreign('category_id').references('id').inTable('classification_categories');
          t.unique(['parse_format_id', 'normalized_value']);
          t.float('created_at').notNullable();
          t.float('updated_at').notNullable();
        })
      )
      .then(() =>
        knex.schema.createTable('classification_overrides', (t) => {
          t.increments('id').primary();
          t.integer('raw_value_id').unsigned().notNullable();
          t.foreign('raw_value_id').references('id').inTable('classification_raw_values');
          t.integer('category_id').unsigned().notNullable();
          t.foreign('category_id').references('id').inTable('classification_categories');
          t.unique(['raw_value_id']);
          t.float('created_at').notNullable();
          t.float('updated_at').notNullable();
        })
      )
      .then(() => knex('parse_formats').insert(PARSE_FORMATS.map((p) => ({ ...p, created_at: ts, updated_at: ts }))))
      .then(() =>
        knex('classification_categories').insert(
          CATEGORIES.map((name) => ({ name, created_at: ts, updated_at: ts }))
        )
      )
  );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('classification_overrides')
    .then(() => knex.schema.dropTableIfExists('classification_mappings'))
    .then(() => knex.schema.dropTableIfExists('classification_normalized'))
    .then(() => knex.schema.dropTableIfExists('classification_raw_values'))
    .then(() => knex.schema.dropTableIfExists('classification_categories'))
    .then(() => knex.schema.dropTableIfExists('parse_formats'));
};
