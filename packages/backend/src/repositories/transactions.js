/**
 * Transaction repository. Portable SQL (SQLite + PostgreSQL).
 */

const { getKnex } = require('../db/knex');
const { nowEpoch, validateTransactionDate } = require('../db/dates');

function now() {
  return nowEpoch();
}

function list(filters = {}) {
  let q = getKnex()('transactions').select('*').orderBy('date', 'desc');
  if (filters.account_id != null) {
    q = q.where('account_id', filters.account_id);
  }
  if (filters.from_date) {
    q = q.where('date', '>=', filters.from_date);
  }
  if (filters.to_date) {
    q = q.where('date', '<=', filters.to_date);
  }
  return q;
}

function findById(id) {
  return getKnex()('transactions').where({ id }).first();
}

function create(data) {
  const ts = now();
  const date = validateTransactionDate(data.date);
  const row = {
    account_id: data.account_id,
    date,
    description: data.description ?? null,
    amount: data.amount,
    source_category: data.source_category ?? null,
    source_subcategory: data.source_subcategory ?? null,
    category: data.category ?? null,
    subcategory: data.subcategory ?? null,
    transaction_type: data.transaction_type ?? null,
    linked_transaction_id: data.linked_transaction_id ?? null,
    created_at: ts,
    updated_at: ts,
  };
  return getKnex()('transactions')
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
    'source_category',
    'source_subcategory',
    'category',
    'subcategory',
    'transaction_type',
    'linked_transaction_id',
  ];
  const updates = { updated_at: now() };
  for (const k of allowed) {
    if (fields[k] !== undefined) updates[k] = fields[k];
  }
  if (fields.date !== undefined) {
    updates.date = validateTransactionDate(fields.date);
  }
  return getKnex()('transactions')
    .where({ id })
    .update(updates)
    .then(() => findById(id));
}

module.exports = {
  list,
  findById,
  create,
  update,
};
