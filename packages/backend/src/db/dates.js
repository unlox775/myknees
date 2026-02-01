/**
 * Date/timestamp helpers for the data layer.
 * - Timestamps: intent is PostgreSQL timestamp with time zone (TIMESTAMPTZ);
 *   stored as epoch seconds with fractional part (REAL) for portability and
 *   sub-second accuracy; display in local TZ in app.
 * - Transaction date: date only, YYYY-MM-DD; validated as valid calendar date.
 */

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Current time as epoch seconds with fractional part (UTC).
 * Use for created_at / updated_at. Gives sub-second accuracy (e.g. milliseconds).
 */
function nowEpoch() {
  return Date.now() / 1000;
}

/**
 * Validate and normalize a transaction date (date only, no time).
 * Expects YYYY-MM-DD. Returns the same string if valid.
 * @param {string} value - Candidate date string
 * @returns {string} Normalized YYYY-MM-DD
 * @throws {Error} If format is wrong or not a valid calendar date
 */
function validateTransactionDate(value) {
  if (typeof value !== 'string' || !DATE_ONLY_REGEX.test(value)) {
    throw new Error('Transaction date must be YYYY-MM-DD');
  }
  const d = new Date(value + 'T12:00:00.000Z');
  if (Number.isNaN(d.getTime())) {
    throw new Error('Transaction date is not a valid date');
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const reconstructed = `${y}-${m}-${day}`;
  if (reconstructed !== value) {
    throw new Error('Transaction date must be a valid calendar date (e.g. no Feb 30)');
  }
  return value;
}

/**
 * Sanity-check an epoch timestamp (e.g. from DB).
 * @param {number} ts - Unix seconds (integer or fractional)
 * @returns {boolean} True if value looks like a sane date
 */
function isValidEpoch(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return false;
  // Rough range: 2000-01-01 to 2100-01-01
  return ts >= 946684800 && ts <= 4102444800;
}

/**
 * Convert Excel serial date (e.g. 45964) to YYYY-MM-DD.
 * Excel epoch: 1899-12-30 (day 1 = 1900-01-01).
 */
function excelSerialToDateString(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  const excelEpoch = new Date(1899, 11, 30);
  const d = new Date(excelEpoch.getTime() + n * 86400 * 1000);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = {
  nowEpoch,
  validateTransactionDate,
  isValidEpoch,
  excelSerialToDateString,
};
