/**
 * Projection planning state: anchors, profiles, and inferred recurring
 * candidates. These tables are intentionally separate from imported
 * transactions so planning assumptions can evolve independently.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('projection_balance_anchors', (t) => {
    t.increments('id').primary();
    t.text('anchor_key').notNullable().unique();
    t.integer('account_id').unsigned().nullable();
    t.foreign('account_id').references('id').inTable('accounts');
    t.text('account_identifier').notNullable();
    t.date('anchor_date').notNullable();
    t.text('anchor_transaction_description');
    t.real('anchor_transaction_amount');
    t.real('anchor_balance').notNullable();
    t.text('source_type').notNullable();
    t.text('source_note').notNullable();
    t.text('metadata_json');
    t.boolean('active').notNullable().defaultTo(true);
    t.float('created_at').notNullable();
    t.float('updated_at').notNullable();

    t.index(['account_identifier', 'anchor_date']);
    t.index(['active']);
  });

  await knex.schema.createTable('projection_profiles', (t) => {
    t.increments('id').primary();
    t.text('profile_key').notNullable().unique();
    t.text('profile_name').notNullable();
    t.integer('account_id').unsigned().nullable();
    t.foreign('account_id').references('id').inTable('accounts');
    t.text('account_identifier').notNullable();

    t.text('pattern_type').notNullable();
    t.text('direction').notNullable();
    t.text('amount_mode').notNullable();
    t.real('amount_value').notNullable().defaultTo(0);

    t.integer('cadence_interval_months').notNullable().defaultTo(1);
    t.integer('cadence_interval_days');
    t.integer('day_of_month');

    t.date('start_date').notNullable();
    t.date('end_date');

    t.boolean('paused').notNullable().defaultTo(false);
    t.date('resume_date');
    t.text('linked_profile_key');

    t.text('confidence_label').notNullable().defaultTo('medium');
    t.real('confidence_score').notNullable().defaultTo(0.5);

    t.text('source_type').notNullable();
    t.text('source_note').notNullable();
    t.text('assumption_note');
    t.text('metadata_json');

    t.boolean('active').notNullable().defaultTo(true);
    t.float('created_at').notNullable();
    t.float('updated_at').notNullable();

    t.index(['account_identifier', 'active']);
    t.index(['pattern_type']);
  });

  await knex.schema.createTable('projection_profile_candidates', (t) => {
    t.increments('id').primary();
    t.text('candidate_key').notNullable().unique();
    t.integer('account_id').unsigned().nullable();
    t.foreign('account_id').references('id').inTable('accounts');
    t.text('account_identifier').notNullable();

    t.text('normalized_description').notNullable();
    t.text('profile_name').notNullable();
    t.text('direction').notNullable();
    t.text('pattern_type').notNullable();
    t.integer('cadence_interval_months').notNullable().defaultTo(1);
    t.integer('day_of_month');
    t.real('amount_estimate').notNullable();

    t.integer('transactions_observed').notNullable();
    t.integer('months_observed').notNullable();
    t.date('first_seen_date').notNullable();
    t.date('last_seen_date').notNullable();

    t.text('confidence_label').notNullable();
    t.real('confidence_score').notNullable();

    t.text('source_type').notNullable();
    t.text('source_note').notNullable();
    t.text('metadata_json');

    t.float('created_at').notNullable();
    t.float('updated_at').notNullable();

    t.index(['account_identifier']);
    t.index(['confidence_score']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('projection_profile_candidates');
  await knex.schema.dropTableIfExists('projection_profiles');
  await knex.schema.dropTableIfExists('projection_balance_anchors');
};
