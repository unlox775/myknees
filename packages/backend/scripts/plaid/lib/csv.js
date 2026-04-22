function escapeCsvField(s) {
  if (s == null || s === '') return '';
  const t = String(s);
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

/** @param {string[]} row */
function csvLine(row) {
  return row.map(escapeCsvField).join(',');
}

module.exports = { escapeCsvField, csvLine };
