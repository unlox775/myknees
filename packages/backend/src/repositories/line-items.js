/**
 * Line item (breakdown) repository. Portable SQL.
 */

const { getKnex } = require('../db/knex');
const { nowEpoch } = require('../db/dates');

function now() {
  return nowEpoch();
}

function listByTransactionId(transactionId) {
  return getKnex()('line_items')
    .where({ transaction_id: transactionId })
    .orderBy('id')
    .select('*');
}

function findById(id) {
  return getKnex()('line_items').where({ id }).first();
}

function create(data) {
  const ts = now();
  const row = {
    transaction_id: data.transaction_id,
    description: data.description ?? null,
    amount: data.amount,
    category: data.category ?? null,
    subcategory: data.subcategory ?? null,
    linked_transaction_id: data.linked_transaction_id ?? null,
    linked_line_item_id: data.linked_line_item_id ?? null,
    created_at: ts,
    updated_at: ts,
  };
  return getKnex()('line_items')
    .insert(row)
    .then((result) => {
      const id = Array.isArray(result) ? result[0] : result;
      return findById(id);
    });
}

function update(id, fields) {
  const allowed = [
    'description',
    'amount',
    'category',
    'subcategory',
    'linked_transaction_id',
    'linked_line_item_id',
  ];
  const updates = { updated_at: now() };
  for (const k of allowed) {
    if (fields[k] !== undefined) updates[k] = fields[k];
  }
  return getKnex()('line_items')
    .where({ id })
    .update(updates)
    .then(() => findById(id));
}

module.exports = {
  listByTransactionId,
  findById,
  create,
  update,
};
