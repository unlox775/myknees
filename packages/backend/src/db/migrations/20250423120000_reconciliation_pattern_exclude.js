/**
 * reconciliation_relationship_patterns.exclude:
 * 0 = include row when pattern matches (OR with other include patterns on that side).
 * 1 = if pattern matches, row is OUT of scope even if include patterns matched.
 */

exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('reconciliation_relationship_patterns', 'exclude');
  if (!has) {
    await knex.schema.alterTable('reconciliation_relationship_patterns', (t) => {
      t.integer('exclude').notNullable().defaultTo(0);
    });
  }
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('reconciliation_relationship_patterns', 'exclude');
  if (has) {
    await knex.schema.alterTable('reconciliation_relationship_patterns', (t) => {
      t.dropColumn('exclude');
    });
  }
};
