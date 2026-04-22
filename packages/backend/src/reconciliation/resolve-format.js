/**
 * Resolve classification / normalizer format identifier for an account.
 */

/**
 * @param {import('knex').Knex} knex
 * @param {number} accountId
 * @returns {Promise<string>}
 */
async function resolveFormatIdentifier(knex, accountId) {
  const row = await knex('accounts')
    .leftJoin('parse_formats', 'parse_formats.id', 'accounts.parse_format_id')
    .where('accounts.id', accountId)
    .select('accounts.identifier', 'parse_formats.identifier as format_id')
    .first();
  if (!row) throw new Error(`Account not found: ${accountId}`);
  if (row.format_id) return row.format_id;
  const id = String(row.identifier || '').toLowerCase();
  if (id.includes('ally')) return 'ally_bank';
  if (id.includes('chase')) return 'chase_visa';
  return 'capital_one';
}

module.exports = { resolveFormatIdentifier };
