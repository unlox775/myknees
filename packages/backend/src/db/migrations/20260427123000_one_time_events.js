const ONE_TIME_EVENT_CATEGORY = 'One-Time Event';

const SEEDED_EVENTS = [
  {
    event_key: '2026_spring_musical_once_upon_a_mattress',
    display_name: '2026 Spring Musical: Once Upon a Mattress',
    event_year: 2026,
    starts_on: '2026-01-01',
    ends_on: '2026-05-31',
    status: 'active',
    notes: 'Seeded from finance todo supervisor classification packet for drama/play purchases.',
  },
];

exports.up = async function (knex) {
  const ts = Date.now() / 1000;

  const existingCategory = await knex('classification_categories')
    .where({ name: ONE_TIME_EVENT_CATEGORY })
    .first();
  if (!existingCategory) {
    await knex('classification_categories').insert({
      name: ONE_TIME_EVENT_CATEGORY,
      created_at: ts,
      updated_at: ts,
    });
  }

  const hasOneTimeEvents = await knex.schema.hasTable('one_time_events');
  if (!hasOneTimeEvents) {
    await knex.schema.createTable('one_time_events', (t) => {
      t.increments('id').primary();
      t.text('event_key').notNullable().unique();
      t.text('display_name').notNullable();
      t.integer('event_year');
      t.date('starts_on');
      t.date('ends_on');
      t.text('status').notNullable().defaultTo('active');
      t.text('notes');
      t.float('created_at').notNullable();
      t.float('updated_at').notNullable();
    });
  }

  for (const event of SEEDED_EVENTS) {
    const existingEvent = await knex('one_time_events')
      .where({ event_key: event.event_key })
      .first();
    if (!existingEvent) {
      await knex('one_time_events').insert({
        ...event,
        created_at: ts,
        updated_at: ts,
      });
    }
  }

  const hasEventColumn = await knex.schema.hasColumn('transactions', 'one_time_event_id');
  if (!hasEventColumn) {
    await knex.schema.alterTable('transactions', (t) => {
      t.integer('one_time_event_id').unsigned();
    });
  }
};

exports.down = async function (knex) {
  const hasEventColumn = await knex.schema.hasColumn('transactions', 'one_time_event_id');
  if (hasEventColumn) {
    await knex.schema.alterTable('transactions', (t) => {
      t.dropColumn('one_time_event_id');
    });
  }

  await knex.schema.dropTableIfExists('one_time_events');

  await knex('classification_categories')
    .where({ name: ONE_TIME_EVENT_CATEGORY })
    .delete();
};
