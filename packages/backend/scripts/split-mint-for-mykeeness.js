#!/usr/bin/env node
/**
 * Split Mint-style multi-account CSVs into per-account files that match
 * import-transaction-records column layouts (ally_bank | capital_one).
 *
 * Supports:
 *   - "Mint classic" export: Date, Description, Original Description, Amount, Transaction Type, Category, Account Name, ...
 *   - "DataSource" style: Date, Description, Amount, Category, Account Name, Month, Bucket, Year, Notes (amounts already signed)
 *
 * Merges multiple input files, dedupes exact (date, description, amount), sorts by date.
 *
 * Usage:
 *   node scripts/split-mint-for-mykeeness.js --mapping=imports/ignore/older/mint-account-mapping.json --out=imports/ignore/older/split FILE1.csv FILE2.csv
 */

const fs = require('fs');
const path = require('path');

/** Same CSV parser as import-transaction-records.js */
function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (inQuotes && content[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && (c === ',' || c === '\n' || c === '\r')) {
      if (c === ',') {
        row.push(cell.trim());
        cell = '';
      } else {
        row.push(cell.trim());
        cell = '';
        if (row.some((x) => x !== '')) rows.push(row);
        row = [];
        if (c === '\r' && content[i + 1] === '\n') i++;
      }
    } else {
      cell += c;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    if (row.some((x) => x !== '')) rows.push(row);
  }
  return rows;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Parse common Mint/Excel date strings → YYYY-MM-DD or null */
function toIsoDate(s) {
  if (s == null || String(s).trim() === '') return null;
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (/^\d+(\.\d*)?$/.test(t)) {
    const excelEpoch = new Date(1899, 11, 30);
    const n = parseFloat(t);
    const d = new Date(excelEpoch.getTime() + n * 86400 * 1000);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const mm = parseInt(mdy[1], 10);
    const dd = parseInt(mdy[2], 10);
    const yyyy = parseInt(mdy[3], 10);
    const d = new Date(yyyy, mm - 1, dd);
    if (
      d.getFullYear() !== yyyy ||
      d.getMonth() !== mm - 1 ||
      d.getDate() !== dd
    )
      return null;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }
  return null;
}

function parseAmount(s) {
  if (s == null || s === '') return null;
  const t = String(s).trim().replace(/\s+[A-Za-z]\s*$/, '');
  const n = parseFloat(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function loadMapping(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const j = JSON.parse(raw);
  if (!Array.isArray(j.accounts)) {
    throw new Error('mapping JSON must have an "accounts" array');
  }
  return j.accounts;
}

/**
 * @returns {'mint_classic'|'datasource'|null}
 */
function detectVariant(headerRow) {
  const h = headerRow.join('|').toLowerCase();
  if (
    headerRow.includes('Original Description') &&
    headerRow.includes('Transaction Type')
  )
    return 'mint_classic';
  if (
    headerRow.includes('Month') &&
    headerRow.includes('Year') &&
    headerRow.includes('Bucket')
  )
    return 'datasource';
  if (headerRow.includes('Account Name') && headerRow.includes('Amount'))
    return 'mint_classic';
  return null;
}

function matchRule(rules, accountName) {
  const name = (accountName || '').trim();
  for (const rule of rules) {
    if (rule.match === name) return rule;
  }
  return null;
}

function rowsFromMintClassic(header, rows) {
  const hi = (label) => header.findIndex((x) => x === label);
  const idx = {
    date: hi('Date'),
    desc: hi('Description'),
    amount: hi('Amount'),
    type: hi('Transaction Type'),
    account: hi('Account Name'),
  };
  if (idx.date < 0 || idx.desc < 0 || idx.amount < 0 || idx.account < 0) {
    throw new Error(
      'Mint classic CSV missing columns (need Date, Description, Amount, Account Name)'
    );
  }
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const iso = toIsoDate(r[idx.date]);
    if (!iso) continue;
    const rawAmt = parseAmount(r[idx.amount]);
    if (rawAmt == null) continue;
    const tt = (r[idx.type] || '').toLowerCase().trim();
    const signed =
      tt === 'credit' ? Math.abs(rawAmt) : tt === 'debit' ? -Math.abs(rawAmt) : rawAmt;
    const desc = (r[idx.desc] || '').trim();
    const acc = (r[idx.account] || '').trim();
    out.push({ iso, desc, amount: signed, account: acc, source: 'mint_classic' });
  }
  return out;
}

function rowsFromDatasource(header, rows) {
  const hi = (label) => header.findIndex((x) => x === label);
  const idx = {
    date: hi('Date'),
    desc: hi('Description'),
    amount: hi('Amount'),
    account: hi('Account Name'),
  };
  if (idx.date < 0 || idx.desc < 0 || idx.amount < 0 || idx.account < 0) {
    throw new Error(
      'DataSource CSV missing columns (need Date, Description, Amount, Account Name)'
    );
  }
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const iso = toIsoDate(r[idx.date]);
    if (!iso) continue;
    const rawAmt = parseAmount(r[idx.amount]);
    if (rawAmt == null) continue;
    const desc = (r[idx.desc] || '').trim();
    const acc = (r[idx.account] || '').trim();
    out.push({ iso, desc, amount: rawAmt, account: acc, source: 'datasource' });
  }
  return out;
}

function dedupeKey(r) {
  return `${r.iso}\t${r.desc}\t${String(r.amount)}`;
}

function main() {
  const args = process.argv.slice(2);
  const mapArg = args.find((a) => a.startsWith('--mapping='))?.split('=')[1];
  const outArg =
    args.find((a) => a.startsWith('--out='))?.split('=')[1] ||
    'imports/ignore/older/split';
  const files = args.filter((a) => !a.startsWith('--') && a.endsWith('.csv'));
  if (!mapArg || files.length === 0) {
    console.error(
      'Usage: node scripts/split-mint-for-mykeeness.js --mapping=path/to/mint-account-mapping.json --out=imports/ignore/older/split FILE1.csv [FILE2.csv ...]'
    );
    process.exit(1);
  }

  const mappingPath = path.isAbsolute(mapArg)
    ? mapArg
    : path.resolve(process.cwd(), mapArg);
  const rules = loadMapping(mappingPath);
  const outDir = path.isAbsolute(outArg)
    ? outArg
    : path.resolve(process.cwd(), outArg);
  fs.mkdirSync(outDir, { recursive: true });

  /** @type {Map<string, { format: string, identifier: string, rows: typeof row[] }>} */
  const buckets = new Map();
  let unmatched = 0;
  const unmatchedAccounts = new Map();

  for (const fp of files) {
    const resolved = path.isAbsolute(fp) ? fp : path.resolve(process.cwd(), fp);
    if (!fs.existsSync(resolved)) {
      console.error('File not found:', resolved);
      process.exit(1);
    }
    const content = fs.readFileSync(resolved, 'utf8');
    const table = parseCsv(content);
    if (table.length < 2) {
      console.warn('Skip empty:', resolved);
      continue;
    }
    const header = table[0];
    const variant = detectVariant(header);
    if (!variant) {
      console.error('Unknown CSV shape (headers):', header.join(', '));
      process.exit(1);
    }
    let normalized =
      variant === 'mint_classic'
        ? rowsFromMintClassic(header, table)
        : rowsFromDatasource(header, table);
    console.error(resolved, '→', variant, 'rows', normalized.length);

    for (const row of normalized) {
      const rule = matchRule(rules, row.account);
      if (!rule) {
        unmatched++;
        unmatchedAccounts.set(
          row.account,
          (unmatchedAccounts.get(row.account) || 0) + 1
        );
        continue;
      }
      const key = `${rule.identifier}\t${rule.format}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          format: rule.format,
          identifier: rule.identifier,
          rows: [],
        });
      }
      buckets.get(key).rows.push(row);
    }
  }

  // Dedupe per bucket, sort
  const manifest = { generated: new Date().toISOString(), imports: [] };
  for (const [, bucket] of buckets) {
    const seen = new Set();
    const unique = [];
    for (const r of bucket.rows) {
      const k = dedupeKey(r);
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(r);
    }
    unique.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));

    const base = `${bucket.identifier}.${bucket.format}`;
    const outFile = path.join(outDir, `${base}.csv`);
    let lines;
    if (bucket.format === 'ally_bank') {
      lines = ['Date,Description,Amount'];
      for (const r of unique) {
        const desc = r.desc.replace(/"/g, '""');
        lines.push(`"${r.iso}","${desc}",${r.amount}`);
      }
    } else if (bucket.format === 'capital_one') {
      lines = ['Transaction Date,Description,Line Price'];
      for (const r of unique) {
        const desc = r.desc.replace(/"/g, '""');
        lines.push(`"${r.iso}","${desc}",${r.amount}`);
      }
    } else {
      console.error('Unsupported format in mapping:', bucket.format);
      process.exit(1);
    }
    fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
    const min = unique.length ? unique[0].iso : '';
    const max = unique.length ? unique[unique.length - 1].iso : '';
    console.error(
      `Wrote ${outFile} (${unique.length} rows, ${min} .. ${max})`
    );
    manifest.imports.push({
      csv: path.relative(process.cwd(), outFile),
      account: bucket.identifier,
      format: bucket.format,
      rowCount: unique.length,
      minDate: min || null,
      maxDate: max || null,
    });
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.error('Wrote', manifestPath);

  if (unmatched > 0) {
    console.error(
      '\nUnmatched rows (not in mapping; skipped):',
      unmatched,
      '— top Account Name counts:'
    );
    const sorted = [...unmatchedAccounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name, cnt] of sorted.slice(0, 30)) {
      console.error(' ', cnt, name);
    }
  }

  console.error('\nNext: run imports from packages/backend, e.g.');
  for (const imp of manifest.imports) {
    console.error(
      `  npm run import:transaction-records -- --format=${imp.format} --account=${imp.account} "${imp.csv}"`
    );
  }
}

main();
