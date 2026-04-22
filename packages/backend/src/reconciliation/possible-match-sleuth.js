/**
 * For unmatched transfer rows, search the *other* account for any transaction with the same
 * amount magnitude within amount_tolerance and posted date within ±sleuthWindowDays (default 2).
 * Used only for the first N displayed samples (CLI --sample).
 */

const { getParser } = require('../classification');

/** @param {string} dateStr YYYY-MM-DD */
function dayDiff(dateStrA, dateStrB) {
  const t1 = Date.parse(`${dateStrA}T12:00:00.000Z`);
  const t2 = Date.parse(`${dateStrB}T12:00:00.000Z`);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 9999;
  return Math.abs(Math.round((t2 - t1) / 86400000));
}

/** @param {string} dateStr YYYY-MM-DD */
function addCalendarDays(dateStr, deltaDays) {
  const t = Date.parse(`${dateStr}T12:00:00.000Z`) + deltaDays * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * @param {import('knex').Knex} knex
 * @param {object} args
 * @param {number} args.otherAccountId
 * @param {string} args.centerDate
 * @param {number} args.amount
 * @param {number} args.tolerance
 * @param {number} args.windowDays calendar days each side of centerDate
 * @param {string} [args.formatOther] parse format id for normalized hint on the candidate
 */
async function findBestPossibleMatch(knex, args) {
  const { otherAccountId, centerDate, amount, tolerance, windowDays, formatOther } = args;
  const minD = addCalendarDays(centerDate, -windowDays);
  const maxD = addCalendarDays(centerDate, windowDays);
  const mag = Math.abs(Number(amount));
  if (!Number.isFinite(mag) || mag < 1e-9) return null;

  const rows = await knex('transactions')
    .where({ account_id: otherAccountId })
    .whereBetween('date', [minD, maxD])
    .whereRaw('ABS(ABS(amount) - ?) <= ?', [mag, tolerance])
    .select('id', 'date', 'description', 'amount')
    .limit(100);

  if (!rows.length) return null;

  const parser = formatOther ? getParser(formatOther) : null;

  rows.sort((x, y) => {
    const dx = dayDiff(centerDate, x.date) - dayDiff(centerDate, y.date);
    if (dx !== 0) return dx;
    return Number(x.id) - Number(y.id);
  });

  const best = rows[0];
  let normalized = null;
  if (parser) normalized = parser.normalize(best.description || '');

  return {
    id: best.id,
    date: best.date,
    amount: Number(best.amount),
    description: best.description,
    normalized,
  };
}

/**
 * @param {import('knex').Knex} knex
 * @param {object} ctx
 * @param {number} ctx.accountAId
 * @param {number} ctx.accountBId
 * @param {string} ctx.formatA
 * @param {string} ctx.formatB
 * @param {number} ctx.tolerance
 * @param {{ id: number, date: string, amount: number, description?: string|null, normalized?: string|null }[]} ctx.unmatchedA
 * @param {{ id: number, date: string, amount: number, description?: string|null, normalized?: string|null }[]} ctx.unmatchedB
 * @param {number} ctx.lookupLimit first N rows of each list (same as CLI sample cap)
 * @param {number} [ctx.sleuthWindowDays] default from env MYKNEES_RECONCILE_SLEUTH_DAYS or 2
 */
async function enrichUnmatchedWithPossibleMatches(knex, ctx) {
  const {
    accountAId,
    accountBId,
    formatA,
    formatB,
    tolerance,
    unmatchedA,
    unmatchedB,
    lookupLimit,
  } = ctx;
  const envW = parseInt(process.env.MYKNEES_RECONCILE_SLEUTH_DAYS || '', 10);
  const sleuthWindowDays =
    ctx.sleuthWindowDays != null
      ? Number(ctx.sleuthWindowDays)
      : Number.isFinite(envW) && envW >= 0
        ? envW
        : 2;

  if (!lookupLimit || lookupLimit <= 0) {
    return { unmatchedA, unmatchedB };
  }

  const n = Math.max(0, lookupLimit);
  const outA = unmatchedA.map((r) => ({ ...r }));
  const outB = unmatchedB.map((r) => ({ ...r }));

  const tol = Number.isFinite(Number(tolerance)) ? Number(tolerance) : 0.01;

  await Promise.all(
    Array.from({ length: Math.min(n, outA.length) }, async (_, i) => {
      const row = outA[i];
      const pm = await findBestPossibleMatch(knex, {
        otherAccountId: accountBId,
        centerDate: row.date,
        amount: row.amount,
        tolerance: tol,
        windowDays: sleuthWindowDays,
        formatOther: formatB,
      });
      if (pm) outA[i].possibleMatch = pm;
    })
  );

  await Promise.all(
    Array.from({ length: Math.min(n, outB.length) }, async (_, i) => {
      const row = outB[i];
      const pm = await findBestPossibleMatch(knex, {
        otherAccountId: accountAId,
        centerDate: row.date,
        amount: row.amount,
        tolerance: tol,
        windowDays: sleuthWindowDays,
        formatOther: formatA,
      });
      if (pm) outB[i].possibleMatch = pm;
    })
  );

  return { unmatchedA: outA, unmatchedB: outB };
}

module.exports = {
  enrichUnmatchedWithPossibleMatches,
  findBestPossibleMatch,
  dayDiff,
  addCalendarDays,
};
