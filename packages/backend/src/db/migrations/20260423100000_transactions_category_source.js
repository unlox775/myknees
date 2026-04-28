/**
 * Add transaction-level categorization source marker so manual overrides can
 * coexist with rule-based recategorization.
 */

exports.up = function (knex) {
  return knex.schema.alterTable('transactions', (t) => {
    t.text('category_source').notNullable().defaultTo('rule_based');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('transactions', (t) => {
    t.dropColumn('category_source');
  });
};
