exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('classification_rule_overrides');
  if (hasTable) return;

  await knex.schema.createTable('classification_rule_overrides', (t) => {
    t.increments('id').primary();
    t.integer('parse_format_id').unsigned().notNullable();
    t.foreign('parse_format_id').references('id').inTable('parse_formats');
    t.text('normalized_value').notNullable();
    t.integer('category_id').unsigned().notNullable();
    t.foreign('category_id').references('id').inTable('classification_categories');
    t.integer('one_time_event_id').unsigned();
    t.foreign('one_time_event_id').references('id').inTable('one_time_events');
    t.unique(['parse_format_id', 'normalized_value']);
    t.float('created_at').notNullable();
    t.float('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('classification_rule_overrides');
};
