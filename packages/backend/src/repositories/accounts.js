/**
 * Account repository. All DB access for accounts goes through here.
 * Works with both SQLite and PostgreSQL via knex.
 */

const { getKnex } = require('../db/knex');
const { nowEpoch } = require('../db/dates');

function now() {
  return nowEpoch();
}

function list() {
  return getKnex()('accounts').orderBy('identifier').select('*');
}

function findById(id) {
  return getKnex()('accounts').where({ id }).first();
}

function findByIdentifier(identifier) {
  return getKnex()('accounts').where({ identifier }).first();
}

function create({ identifier, name, type }) {
  const ts = now();
  return getKnex()('accounts')
    .insert({
      identifier,
      name: name || identifier,
      type: type || 'bank',
      created_at: ts,
      updated_at: ts,
    })
    .then((result) => {
      const id = Array.isArray(result) ? result[0] : result;
      return findById(id);
    });
}

function update(id, fields) {
  const allowed = ['name', 'type', 'identifier'];
  const updates = { updated_at: now() };
  for (const k of allowed) {
    if (fields[k] !== undefined) updates[k] = fields[k];
  }
  return getKnex()('accounts')
    .where({ id })
    .update(updates)
    .then(() => findById(id));
}

module.exports = {
  list,
  findById,
  findByIdentifier,
  create,
  update,
};
