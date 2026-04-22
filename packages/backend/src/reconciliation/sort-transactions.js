/**
 * Sort transaction-like rows for display: newest calendar date first, then higher id.
 * @param {{ date?: string, id?: number }[]} rows
 */
function sortTxByDateDesc(rows) {
  return [...rows].sort((a, b) => {
    const da = String(a.date || '');
    const db = String(b.date || '');
    if (da !== db) return db.localeCompare(da);
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

module.exports = { sortTxByDateDesc };
