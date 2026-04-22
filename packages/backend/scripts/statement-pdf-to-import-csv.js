#!/usr/bin/env node
/**
 * Extract import-ready transaction CSVs from Ally combined statements and
 * Capital One Venture-style PDFs using embedded text (pdf-parse), not OCR.
 *
 * Ally combined statements: splits by account (9355 Char bills/tithing, 0328
 * four wheelers), parses only each account's Activity block (after Summary /
 * overdraft lines), checksums against Beginning/Ending in that account's
 * summary, and writes two CSVs next to the PDF. On checksum failure: no
 * writes, existing target CSVs are removed, process exits non-zero.
 *
 * Output columns match import-transaction-records.js FORMAT_COLUMNS:
 *   ally_bank:     Date, Description, Amount
 *   capital_one:   Transaction Date, Description, Line Price
 *
 * Usage:
 *   node scripts/statement-pdf-to-import-csv.js ally <YYYY-MM.pdf> [--month=YYYY-MM]
 *   node scripts/statement-pdf-to-import-csv.js capital-one <Statement_MMYYYY_*.pdf> [--month=YYYY-MM]
 *
 * Legacy (single out path, no checksum — capital-one only):
 *   node scripts/statement-pdf-to-import-csv.js capital-one <in.pdf> <out.csv>
 *
 * Column headers must match scripts/import-transaction-records.js FORMAT_COLUMNS
 * and resolveCapitalOneColumns() (capital_one accepts Line Price OR Debit+Credit).
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

/** @type {readonly string[]} Same strings as FORMAT_COLUMNS.ally_bank in import-transaction-records.js */
const ALLY_IMPORT_HEADER = Object.freeze(['Date', 'Description', 'Amount']);
/** @type {readonly string[]} Same as FORMAT_COLUMNS.capital_one (Line Price mode). */
const CAPITAL_ONE_IMPORT_HEADER = Object.freeze(['Transaction Date', 'Description', 'Line Price']);

const MONTH = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseMoney(s) {
  const t = String(s).replace(/[$,\s]/g, '');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function cents(n) {
  return Math.round(Number(n) * 100);
}

function formatAmount(n) {
  if (!Number.isFinite(n)) return '';
  const x = Math.round(n * 100) / 100;
  if (Object.is(x, -0)) return '0.00';
  return x.toFixed(2);
}

function csvEscape(cell) {
  const s = String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isoFromUTC(year, monthIndex, day) {
  const d = new Date(Date.UTC(year, monthIndex, day));
  if (d.getUTCMonth() !== monthIndex) return null;
  return d.toISOString().slice(0, 10);
}

function parseCycleRange(text) {
  const re = /([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})\s*[-–]\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})/;
  const m = text.match(re);
  if (!m) return null;
  const sm = MONTH[m[1].toLowerCase()];
  const em = MONTH[m[4].toLowerCase()];
  if (sm == null || em == null) return null;
  const start = new Date(Date.UTC(parseInt(m[3], 10), sm, parseInt(m[2], 10), 12));
  const end = new Date(Date.UTC(parseInt(m[6], 10), em, parseInt(m[5], 10), 12));
  return { start, end };
}

function inferTransIso(monAbbrev, dayNum, rangeStart, rangeEnd) {
  const mi = MONTH[monAbbrev.toLowerCase()];
  if (mi == null) return null;
  const slackMs = 45 * 86400000;
  const lo = rangeStart.getTime() - slackMs;
  const hi = rangeEnd.getTime() + slackMs;
  const candidates = [];
  const y0 = rangeStart.getUTCFullYear();
  const y1 = rangeEnd.getUTCFullYear();
  for (let y = y0 - 1; y <= y1 + 1; y++) {
    const iso = isoFromUTC(y, mi, dayNum);
    if (!iso) continue;
    const t = new Date(`${iso}T12:00:00.000Z`).getTime();
    if (t >= lo && t <= hi) candidates.push({ iso, t });
  }
  if (candidates.length === 0) return null;
  const inStrict = candidates.filter(
    (c) => c.t >= rangeStart.getTime() - 86400000 && c.t <= rangeEnd.getTime() + 86400000
  );
  const pool = inStrict.length ? inStrict : candidates;
  pool.sort((a, b) => Math.abs(a.t - rangeStart.getTime()) - Math.abs(b.t - rangeStart.getTime()));
  return pool[0].iso;
}

/** Ally: credit/debit/balance footer on its own line or end of date line */
const ALLY_TRIPLE_LINE = /^\$([\d,]+\.\d{2})-\$([\d,]+\.\d{2})\$([\d,]+\.\d{2})\s*$/;
const ALLY_TRIPLE_TAIL = /(\$[\d,]+\.\d{2}-\$[\d,]+\.\d{2}\$[\d,]+\.\d{2})\s*$/;
const ALLY_DATE = /^(\d{2}\/\d{2}\/\d{4})(.*)$/;

function allyMmddyyyyToIso(mmddyyyy) {
  const [mm, dd, yyyy] = mmddyyyy.split('/').map((x) => parseInt(x, 10));
  if (!mm || !dd || !yyyy) return null;
  return isoFromUTC(yyyy, mm - 1, dd);
}

/** First Beginning/Ending pair with "as of" (summary row), not activity footers. */
function parseAllySummaryBalances(chunkText) {
  const b = chunkText.match(/Beginning Balance, as of \d{2}\/\d{2}\/\d{4}\$([\d,]+\.\d{2})/);
  const e = chunkText.match(/Ending Balance, as of \d{2}\/\d{2}\/\d{4}\$([\d,]+\.\d{2})/);
  if (!b || !e) return null;
  const beginning = parseMoney(b[1]);
  const ending = parseMoney(e[1]);
  if (beginning == null || ending == null) return null;
  return { beginning, ending };
}

function parseAllyActivityRowsFromChunk(chunkText) {
  const actIdx = chunkText.indexOf('Activity');
  if (actIdx < 0) return [];
  const slice = chunkText.slice(actIdx);
  const lines = slice
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const dm = line.match(ALLY_DATE);
    if (!dm) {
      i += 1;
      continue;
    }
    const mmddyyyy = dm[1];
    let rest = dm[2].trim();

    const tail = rest.match(ALLY_TRIPLE_TAIL);
    let creditStr;
    let debitStr;
    let descPart = '';

    if (tail) {
      const inner = tail[1].match(/^\$([\d,]+\.\d{2})-\$([\d,]+\.\d{2})\$([\d,]+\.\d{2})$/);
      if (inner) {
        creditStr = inner[1];
        debitStr = inner[2];
        descPart = rest.slice(0, rest.length - tail[1].length).trim();
        i += 1;
      } else {
        i += 1;
        continue;
      }
    } else {
      descPart = rest;
      i += 1;
      let found = false;
      while (i < lines.length) {
        const L = lines[i];
        const only = L.match(ALLY_TRIPLE_LINE);
        if (only) {
          creditStr = only[1];
          debitStr = only[2];
          i += 1;
          found = true;
          break;
        }
        const nd = L.match(ALLY_DATE);
        if (nd && nd.index === 0) break;
        descPart = `${descPart} ${L}`.trim();
        i += 1;
      }
      if (!found) continue;
    }

    const desc = descPart.replace(/\s+/g, ' ').trim();
    if (!desc || /^(Beginning|Ending)\s+Balance$/i.test(desc)) continue;

    const credit = parseMoney(creditStr);
    const debit = parseMoney(debitStr);
    if (credit == null || debit == null) continue;

    let amount;
    if (credit !== 0) amount = credit;
    else if (debit !== 0) amount = -debit;
    else continue;

    const dateIso = allyMmddyyyyToIso(mmddyyyy);
    if (!dateIso) continue;
    rows.push({ date: dateIso, description: desc, amount });
  }

  rows.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.description.localeCompare(b.description);
  });
  return rows;
}

function allyChecksumOk(rows, beginning, ending) {
  const sum = rows.reduce((s, r) => s + r.amount, 0);
  return cents(sum) === cents(ending - beginning);
}

function parseAllyCombinedAccounts(text) {
  const parts = text.split('Account Number:');
  if (parts.length < 3) {
    throw new Error(
      `Expected Ally combined statement with two "Account Number:" sections; found ${parts.length - 1}`
    );
  }
  const chunkChar = parts[1];
  const chunkFour = parts[2];
  const summaryChar = parseAllySummaryBalances(chunkChar);
  const summaryFour = parseAllySummaryBalances(chunkFour);
  if (!summaryChar) throw new Error('Could not parse summary (beginning/ending) for Char Ally / bills account chunk');
  if (!summaryFour) throw new Error('Could not parse summary (beginning/ending) for 4 wheelers account chunk');

  const rowsChar = parseAllyActivityRowsFromChunk(chunkChar);
  const rowsFour = parseAllyActivityRowsFromChunk(chunkFour);

  if (!allyChecksumOk(rowsChar, summaryChar.beginning, summaryChar.ending)) {
    const sum = rowsChar.reduce((s, r) => s + r.amount, 0);
    throw new Error(
      `Char Ally / bills: checksum failed. beginning=${summaryChar.beginning} ending=${summaryChar.ending} ` +
        `expected delta=${formatAmount(summaryChar.ending - summaryChar.beginning)} sum(rows)=${formatAmount(sum)} (${rowsChar.length} rows)`
    );
  }
  if (!allyChecksumOk(rowsFour, summaryFour.beginning, summaryFour.ending)) {
    const sum = rowsFour.reduce((s, r) => s + r.amount, 0);
    throw new Error(
      `4 wheelers: checksum failed. beginning=${summaryFour.beginning} ending=${summaryFour.ending} ` +
        `expected delta=${formatAmount(summaryFour.ending - summaryFour.beginning)} sum(rows)=${formatAmount(sum)} (${rowsFour.length} rows)`
    );
  }

  return {
    charBills: { rows: rowsChar, summary: summaryChar },
    fourWheelers: { rows: rowsFour, summary: summaryFour },
  };
}

/** Capital One transaction row: Mon D Mon D ... amount */
const CO_LINE =
  /^([A-Za-z]{3})\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{1,2})\s+(.+?)\s+(-\s*\$[\d,]+\.\d{2}|\$[\d,]+\.\d{2})\s*$/;

function parseCapitalOneAmount(s) {
  const t = s.replace(/\s+/g, '').replace(/,/g, '');
  const neg = t.startsWith('-');
  const n = parseMoney(t.replace(/^-/, ''));
  if (n == null) return null;
  return neg ? -n : n;
}

function parseCapitalOnePdfText(text) {
  const range = parseCycleRange(text);
  if (!range) {
    throw new Error('Could not find billing cycle range (e.g. "Dec 27, 2022 - Jan 26, 2023") in PDF text');
  }
  const { start, end } = range;
  const lines = text.split(/\n/).map((l) => l.trim());
  const rows = [];
  for (const line of lines) {
    if (/^Trans Date\b/i.test(line)) continue;
    const m = line.match(CO_LINE);
    if (!m) continue;
    const transMon = m[1];
    const transDay = parseInt(m[2], 10);
    const desc = m[5].trim();
    if (!desc) continue;
    if (/^Post Date$/i.test(desc)) continue;
    const amtStr = m[6].trim();
    const amount = parseCapitalOneAmount(amtStr);
    if (amount == null) continue;
    const dateIso = inferTransIso(transMon, transDay, start, end);
    if (!dateIso) continue;
    rows.push({ date: dateIso, description: desc, amount });
  }
  rows.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.description.localeCompare(b.description);
  });
  return rows;
}

function monthFromCapitalOneFilename(basename) {
  const m = basename.match(/Statement_(\d{2})(\d{4})_/i);
  if (!m) return null;
  const mm = m[1];
  const yyyy = m[2];
  return `${yyyy}-${mm}`;
}

function writeCsv(rows, header, outPath) {
  const esc = (c) => csvEscape(c);
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([esc(r.date), esc(r.description), esc(formatAmount(r.amount))].join(','));
  }
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
}

/** No data rows — remove file so imports and concat scripts do not see header-only junk. */
function writeCsvOrRemove(rows, header, outPath) {
  if (rows.length === 0) {
    unlinkQuiet(outPath);
    return false;
  }
  writeCsv(rows, header, outPath);
  return true;
}

function unlinkQuiet(p) {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (_) {}
}

function getMonthArg(argv) {
  const a = argv.find((x) => x.startsWith('--month='));
  return a ? a.split('=')[1].trim() : null;
}

async function main() {
  const argv = process.argv.slice(2);
  const kind = argv[0];
  const pdfPath = argv[1];
  const maybeOut = argv[2];
  const monthOverride = getMonthArg(argv);

  if (!kind || !pdfPath) {
    console.error(
      'Usage:\n' +
        '  node scripts/statement-pdf-to-import-csv.js ally <YYYY-MM.pdf> [--month=YYYY-MM]\n' +
        '  node scripts/statement-pdf-to-import-csv.js capital-one <Statement_MMYYYY_*.pdf> [<out.csv> | --month=YYYY-MM]'
    );
    process.exit(1);
  }

  const resolvedPdf = path.isAbsolute(pdfPath) ? pdfPath : path.resolve(process.cwd(), pdfPath);
  if (!fs.existsSync(resolvedPdf)) {
    console.error('PDF not found:', resolvedPdf);
    process.exit(1);
  }

  const pdfDir = path.dirname(resolvedPdf);
  const pdfBase = path.basename(resolvedPdf, '.pdf');

  const buf = fs.readFileSync(resolvedPdf);
  const { text } = await pdfParse(buf);

  if (kind === 'ally') {
    const month =
      monthOverride || (/^\d{4}-\d{2}$/.test(pdfBase) ? pdfBase : null);
    if (!month) {
      console.error('Ally: name the PDF like 2023-01.pdf or pass --month=2023-01');
      process.exit(1);
    }

    const outChar = path.join(pdfDir, `${month}_ally_char_bills_tithing_import.csv`);
    const outFour = path.join(pdfDir, `${month}_ally_four_wheelers_import.csv`);

    let data;
    try {
      data = parseAllyCombinedAccounts(text);
    } catch (e) {
      unlinkQuiet(outChar);
      unlinkQuiet(outFour);
      console.error(e.message || e);
      process.exit(1);
    }

    try {
      writeCsvOrRemove(data.charBills.rows, [...ALLY_IMPORT_HEADER], outChar);
      writeCsvOrRemove(data.fourWheelers.rows, [...ALLY_IMPORT_HEADER], outFour);
    } catch (e) {
      unlinkQuiet(outChar);
      unlinkQuiet(outFour);
      throw e;
    }
    const charNote =
      data.charBills.rows.length === 0
        ? `removed (0 rows) ${outChar}`
        : `wrote ${data.charBills.rows.length} rows → ${outChar}`;
    const fourNote =
      data.fourWheelers.rows.length === 0
        ? `removed (0 rows) ${outFour}`
        : `wrote ${data.fourWheelers.rows.length} rows → ${outFour}`;
    console.log(
      `${charNote}\n${fourNote}\n` +
        `Checksum OK (Char: ${formatAmount(data.charBills.summary.beginning)} → ${formatAmount(
          data.charBills.summary.ending
        )}; 4 wheelers: ${formatAmount(data.fourWheelers.summary.beginning)} → ${formatAmount(
          data.fourWheelers.summary.ending
        )})`
    );
    return;
  }

  if (kind === 'capital-one' || kind === 'capital_one') {
    const legacyCsv = maybeOut && maybeOut.endsWith('.csv') && !maybeOut.startsWith('--');
    if (legacyCsv) {
      const resolvedOut = path.isAbsolute(maybeOut) ? maybeOut : path.resolve(process.cwd(), maybeOut);
      fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
      const rows = parseCapitalOnePdfText(text);
      writeCsv(rows, [...CAPITAL_ONE_IMPORT_HEADER], resolvedOut);
      console.log(`Wrote ${rows.length} rows → ${resolvedOut}`);
      return;
    }

    const month = monthOverride || monthFromCapitalOneFilename(pdfBase);
    if (!month) {
      console.error('Capital One: use Statement_MMYYYY_*.pdf or pass --month=2023-01');
      process.exit(1);
    }
    const outCo = path.join(pdfDir, `${month}_capital_one_import.csv`);
    let rows;
    try {
      rows = parseCapitalOnePdfText(text);
    } catch (e) {
      unlinkQuiet(outCo);
      console.error(e.message || e);
      process.exit(1);
    }
    try {
      writeCsv(rows, [...CAPITAL_ONE_IMPORT_HEADER], outCo);
    } catch (e) {
      unlinkQuiet(outCo);
      throw e;
    }
    console.log(`Wrote ${rows.length} rows → ${outCo}`);
    return;
  }

  console.error('First argument must be "ally" or "capital-one"');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
