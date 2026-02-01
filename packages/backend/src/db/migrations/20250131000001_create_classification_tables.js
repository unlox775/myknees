/**
 * Classification rules: distinct raw values, cached LC (normalizer) output, overrides, mapped category.
 * Per data source (Ally Bank, Capital One, Costco Receipts). Changing LC later does not drift existing mappings.
 */

exports.up = function (knex) {
  return knex.schema
    .createTable('classification_sources', (t) => {
      t.increments('id').primary();
      t.text('name').notNullable().unique(); // ally_bank, capital_one, costco_receipts
      t.text('display_name');
      t.float('created_at').notNullable();
      t.float('updated_at').notNullable();
    })
    .then(() =>
      knex.schema.createTable('classification_raw_values', (t) => {
        t.increments('id').primary();
        t.integer('source_id').unsigned().notNullable();
        t.foreign('source_id').references('id').inTable('classification_sources');
        t.text('raw_value').notNullable(); // distinct raw description string
        t.unique(['source_id', 'raw_value']);
        t.float('created_at').notNullable();
        t.float('updated_at').notNullable();
      })
    )
    .then(() =>
      knex.schema.createTable('classification_normalized', (t) => {
        t.increments('id').primary();
        t.integer('raw_value_id').unsigned().notNullable();
        t.foreign('raw_value_id').references('id').inTable('classification_raw_values');
        t.text('normalized_value').notNullable(); // cached LC (lowercase + regex) output
        t.unique(['raw_value_id']);
        t.float('created_at').notNullable();
        t.float('updated_at').notNullable();
      })
    )
    .then(() =>
      knex.schema.createTable('classification_category_map', (t) => {
        t.increments('id').primary();
        t.integer('source_id').unsigned().notNullable();
        t.foreign('source_id').references('id').inTable('classification_sources');
        t.text('normalized_value').notNullable(); // distinct normalized string -> category
        t.text('category').notNullable();
        t.text('subcategory');
        t.unique(['source_id', 'normalized_value']);
        t.float('created_at').notNullable();
        t.float('updated_at').notNullable();
      })
    )
    .then(() =>
      knex.schema.createTable('classification_overrides', (t) => {
        t.increments('id').primary();
        t.integer('raw_value_id').unsigned().notNullable();
        t.foreign('raw_value_id').references('id').inTable('classification_raw_values');
        t.text('category').notNullable();
        t.text('subcategory');
        t.unique(['raw_value_id']);
        t.float('created_at').notNullable();
        t.float('updated_at').notNullable();
      })
    );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('classification_overrides')
    .then(() => knex.schema.dropTableIfExists('classification_category_map'))
    .then(() => knex.schema.dropTableIfExists('classification_normalized'))
    .then(() => knex.schema.dropTableIfExists('classification_raw_values'))
    .then(() => knex.schema.dropTableIfExists('classification_sources'));
};
