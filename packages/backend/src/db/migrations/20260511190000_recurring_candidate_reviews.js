exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('recurring_candidate_reviews');
  if (hasTable) return;

  await knex.schema.createTable('recurring_candidate_reviews', (t) => {
    t.increments('id').primary();
    t.text('candidate_key').notNullable().unique();
    t.text('status').notNullable().defaultTo('active');
    t.text('merged_into_candidate_key');
    t.text('review_note');
    t.float('created_at').notNullable();
    t.float('updated_at').notNullable();

    t.index(['status']);
    t.index(['merged_into_candidate_key']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('recurring_candidate_reviews');
};
