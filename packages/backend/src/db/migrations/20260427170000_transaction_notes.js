exports.up = async function (knex) {
  const hasNotes = await knex.schema.hasColumn('transactions', 'notes');
  if (!hasNotes) {
    await knex.schema.alterTable('transactions', (t) => {
      t.text('notes');
    });
  }
};

exports.down = async function (knex) {
  const hasNotes = await knex.schema.hasColumn('transactions', 'notes');
  if (hasNotes) {
    await knex.schema.alterTable('transactions', (t) => {
      t.dropColumn('notes');
    });
  }
};
