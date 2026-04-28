#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { getKnex } = require('../src/db/knex');
const { nowEpoch } = require('../src/db/dates');

const ONE_TIME_EVENT_KEY = '2026_spring_musical_once_upon_a_mattress';
const ONE_TIME_EVENT_CATEGORY = 'One-Time Event';
const DEFAULT_WINDOW_DAYS = 3;

const PACKET = [
  ['Dave', '2026-04-17', 8.71, 'spring_musical', 'spring musical audio item'],
  ['Dave', '2026-04-04', 147.10, 'spring_musical', 'spring musical'],
  ['Dave', '2026-03-31', 91.53, 'spring_musical', 'spring musical'],
  ['Dave', '2026-03-31', 122.04, 'spring_musical', 'spring musical'],
  ['Dave', '2026-03-31', 23.97, 'spring_musical', 'spring musical'],
  ['Dave', '2026-03-31', 47.94, 'spring_musical', 'spring musical'],
  ['Dave', '2026-03-17', 20.70, 'home_shopping', 'home shopping'],
  ['Dave', '2026-03-17', 10.89, 'home_shopping', 'home shopping'],
  ['Dave', '2026-03-14', 16.94, 'groceries', 'groceries'],
  ['Dave', '2026-03-13', 12.52, 'home_shopping', 'home shopping'],
  ['Dave', '2026-03-12', 50.67, 'spring_musical', 'spring musical'],
  ['Dave', '2026-02-26', 27.24, 'home_shopping', 'home shopping'],
  ['Dave', '2026-02-10', 16.54, 'spring_musical', 'spring musical'],
  ['Dave', '2026-02-10', 8.27, 'home_repair', 'home (lawnmower fix)'],
  ['Dave', '2026-02-02', 7.58, 'home_shopping', 'home shopping'],
  ['Dave', '2026-01-30', 35.96, 'birthday_gifts', 'birthdays/gifts (Charla)'],
  ['Dave', '2026-01-30', 12.50, 'home_shopping', 'home shopping'],
  ['Dave', '2026-01-23', 14.45, 'birthday_gifts', 'birthdays (Charla)'],
  ['Dave', '2026-01-19', 10.88, 'spring_musical', 'spring musical'],
  ['Dave', '2026-01-12', 10.89, 'spring_musical', 'spring musical'],
  ['Dave', '2026-01-12', 13.40, 'groceries', 'groceries'],
  ['Dave', '2026-01-10', 10.89, 'home_shopping', 'home shopping'],
  ['Dave', '2026-01-09', 23.97, 'home_shopping', 'home shopping'],
  ['Charla', '2026-04-20', null, 'kids_gifts', 'toy/gift'],
  ['Charla', '2026-04-03', 7.63, 'spring_musical', 'drama (hot glue sticks)'],
  ['Charla', '2026-03-26', 64.83, 'home_operations', 'groceries/home operations (printer ink)'],
  ['Charla', '2026-03-10', 25.62, 'kids_music', 'kids (clarinet reeds)'],
  ['Charla', '2026-03-10', 34.86, 'spring_musical', 'drama costumes'],
  ['Charla', '2026-03-09', 14.16, 'spring_musical', 'drama (screen printing ink)'],
  ['Charla', '2026-03-03', 43.58, 'spring_musical', 'drama (screen printing ink)'],
  ['Charla', '2026-02-17', 25.62, 'kids_music', 'kids (clarinet reeds)'],
  ['Charla', '2026-02-11', 25.62, 'kids_music', 'kids (clarinet reeds)'],
  ['Charla', '2026-02-09', 25.03, 'spring_musical', 'drama supplies'],
  ['Charla', '2026-01-21', null, 'kids_home', 'cat leash'],
  ['Charla', '2026-01-20', 59.22, 'birthday_gifts', 'birthdays (Rose)'],
  ['Charla', '2026-01-07', 16.67, 'groceries', 'groceries (kitchen supply)'],
  ['Charla', '2026-01-02', 8.71, 'home_utility', 'groceries/home utility (charging cables)'],
].map((row, index) => ({
  packet_id: `P${String(index + 1).padStart(2, '0')}`,
  account_hint: row[0],
  date: row[1],
  amount_cents: row[2] == null ? null : Math.round(row[2] * 100),
  lane: row[3],
  note: row[4],
}));

function getArg(name) {
  const withEq = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=').slice(1).join('=').trim();
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1].trim();
  }
  return null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function amountDollars(cents) {
  return cents == null ? '(missing)' : `$${(cents / 100).toFixed(2)}`;
}

function amountCents(value) {
  return Math.round(Math.abs(Number(value) || 0) * 100);
}

function dayNumber(dateValue) {
  return Math.floor(Date.parse(`${dateValue}T12:00:00.000Z`) / 86400000);
}

function dayDiff(leftDate, rightDate) {
  return Math.abs(dayNumber(leftDate) - dayNumber(rightDate));
}

function destinationFor(packet, eventId) {
  if (packet.lane === 'spring_musical') {
    return {
      category: ONE_TIME_EVENT_CATEGORY,
      subcategory: ONE_TIME_EVENT_KEY,
      one_time_event_id: eventId,
    };
  }
  if (packet.lane === 'groceries') {
    return { category: 'Food', subcategory: 'groceries', one_time_event_id: null };
  }
  if (packet.lane === 'birthday_gifts') {
    return { category: 'Bday / Special Day', subcategory: 'gifts', one_time_event_id: null };
  }
  if (packet.lane === 'kids_music' || packet.lane === 'kids_gifts' || packet.lane === 'kids_home') {
    return { category: 'Kids', subcategory: packet.lane, one_time_event_id: null };
  }
  return { category: 'Home', subcategory: packet.lane, one_time_event_id: null };
}

function sameDestination(left, right) {
  return (
    left.category === right.category &&
    left.subcategory === right.subcategory &&
    (left.one_time_event_id || null) === (right.one_time_event_id || null)
  );
}

function combinations(items, maxSize) {
  const result = [];
  function walk(start, combo) {
    if (combo.length > 0) result.push(combo.slice());
    if (combo.length >= maxSize) return;
    for (let i = start; i < items.length; i += 1) {
      combo.push(items[i]);
      walk(i + 1, combo);
      combo.pop();
    }
  }
  walk(0, []);
  return result;
}

function chooseSinglePacketMatches(packetRows, txRows, windowDays) {
  const usedTxIds = new Set();
  const matchedPacketIds = new Set();
  const matches = [];
  const ambiguous = [];

  const packetsByAmount = new Map();
  for (const packet of packetRows
    .filter((packet) => packet.amount_cents != null)
    .sort((left, right) => left.date.localeCompare(right.date) || left.packet_id.localeCompare(right.packet_id))) {
    const key = packet.amount_cents;
    if (!packetsByAmount.has(key)) packetsByAmount.set(key, []);
    packetsByAmount.get(key).push(packet);
  }

  for (const [amount, packets] of packetsByAmount.entries()) {
    const transactions = txRows
      .filter((tx) => amountCents(tx.amount) === amount)
      .sort((left, right) => left.date.localeCompare(right.date) || left.id - right.id);
    const assignments = [];

    function walk(packetIndex, assigned, txIds, diffSum, exactCount) {
      if (packetIndex >= packets.length) {
        assignments.push({
          pairs: assigned.slice(),
          count: assigned.length,
          exactCount,
          diffSum,
        });
        return;
      }

      const packet = packets[packetIndex];
      walk(packetIndex + 1, assigned, txIds, diffSum, exactCount);
      for (const tx of transactions) {
        if (txIds.has(tx.id)) continue;
        const diff = dayDiff(packet.date, tx.date);
        if (diff > windowDays) continue;
        txIds.add(tx.id);
        assigned.push({ packet, tx, diff });
        walk(packetIndex + 1, assigned, txIds, diffSum + diff, exactCount + (diff === 0 ? 1 : 0));
        assigned.pop();
        txIds.delete(tx.id);
      }
    }

    walk(0, [], new Set(), 0, 0);
    const viable = assignments.filter((assignment) => assignment.count > 0);
    if (!viable.length) continue;
    viable.sort((left, right) =>
      right.count - left.count ||
      right.exactCount - left.exactCount ||
      left.diffSum - right.diffSum
    );

    const best = viable[0];
    const tiedBest = viable.filter((assignment) =>
      assignment.count === best.count &&
      assignment.exactCount === best.exactCount &&
      assignment.diffSum === best.diffSum
    );

    if (tiedBest.length > 1) {
      const tiedPacketIds = new Set(tiedBest.flatMap((assignment) => assignment.pairs.map((pair) => pair.packet.packet_id)));
      for (const packet of packets.filter((row) => tiedPacketIds.has(row.packet_id))) {
        ambiguous.push({
          packet,
          reason: `multiple transactions matched ${amountDollars(packet.amount_cents)} with the same best score`,
          candidates: transactions.filter((tx) => dayDiff(packet.date, tx.date) <= windowDays),
        });
      }
      continue;
    }

    for (const pair of best.pairs.sort((left, right) => left.packet.date.localeCompare(right.packet.date) || left.packet.packet_id.localeCompare(right.packet.packet_id))) {
      const { packet, tx } = pair;
      usedTxIds.add(tx.id);
      matchedPacketIds.add(packet.packet_id);
      matches.push({
        match_type: 'single_packet_to_single_transaction',
        packet_ids: [packet.packet_id],
        packets: [packet],
        transaction_ids: [tx.id],
        transactions: [tx],
        destination: packet.destination,
      });
    }
  }

  return { matches, ambiguous, usedTxIds, matchedPacketIds };
}

function chooseSinglePacketToTransactionCombos(packetRows, txRows, state, windowDays) {
  const matches = [];
  const ambiguous = [];

  for (const packet of packetRows) {
    if (packet.amount_cents == null || state.matchedPacketIds.has(packet.packet_id)) continue;
    const candidates = txRows
      .filter((tx) => !state.usedTxIds.has(tx.id))
      .filter((tx) => dayDiff(packet.date, tx.date) <= windowDays);
    const combos = combinations(candidates, 3)
      .filter((combo) => combo.length >= 2)
      .filter((combo) => combo.reduce((sum, tx) => sum + amountCents(tx.amount), 0) === packet.amount_cents)
      .sort((left, right) => left.length - right.length);

    if (!combos.length) continue;
    const shortest = combos[0].length;
    const bestCombos = combos.filter((combo) => combo.length === shortest);
    if (bestCombos.length > 1) {
      ambiguous.push({
        packet,
        reason: `multiple transaction combinations matched ${amountDollars(packet.amount_cents)}`,
        candidates: bestCombos.flat(),
      });
      continue;
    }

    const combo = bestCombos[0];
    for (const tx of combo) state.usedTxIds.add(tx.id);
    state.matchedPacketIds.add(packet.packet_id);
    matches.push({
      match_type: 'single_packet_to_multiple_transactions',
      packet_ids: [packet.packet_id],
      packets: [packet],
      transaction_ids: combo.map((tx) => tx.id),
      transactions: combo,
      destination: packet.destination,
    });
  }

  return { matches, ambiguous };
}

function choosePacketCombosToSingleTransaction(packetRows, txRows, state, windowDays) {
  const matches = [];
  const ambiguous = [];
  const unmatchedPackets = packetRows.filter(
    (packet) => packet.amount_cents != null && !state.matchedPacketIds.has(packet.packet_id)
  );

  for (const tx of txRows) {
    if (state.usedTxIds.has(tx.id)) continue;
    const candidates = unmatchedPackets.filter((packet) => dayDiff(packet.date, tx.date) <= windowDays);
    const combos = combinations(candidates, 3)
      .filter((combo) => combo.length >= 2)
      .filter((combo) => combo.reduce((sum, packet) => sum + packet.amount_cents, 0) === amountCents(tx.amount))
      .filter((combo) => combo.every((packet) => sameDestination(packet.destination, combo[0].destination)))
      .sort((left, right) => left.length - right.length);

    if (!combos.length) continue;
    const shortest = combos[0].length;
    const bestCombos = combos.filter((combo) => combo.length === shortest);
    if (bestCombos.length > 1) {
      ambiguous.push({
        transaction: tx,
        reason: `multiple packet combinations matched transaction ${tx.id}`,
        candidates: bestCombos.flat(),
      });
      continue;
    }

    const combo = bestCombos[0];
    state.usedTxIds.add(tx.id);
    for (const packet of combo) state.matchedPacketIds.add(packet.packet_id);
    matches.push({
      match_type: 'multiple_packets_to_single_transaction',
      packet_ids: combo.map((packet) => packet.packet_id),
      packets: combo,
      transaction_ids: [tx.id],
      transactions: [tx],
      destination: combo[0].destination,
    });
  }

  return { matches, ambiguous };
}

async function fetchAmazonTransactions(knex) {
  return knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .where('transactions.date', '>=', '2026-01-01')
    .where('transactions.date', '<=', '2026-04-23')
    .whereRaw('UPPER(transactions.description) LIKE ?', ['%AMAZON%'])
    .select(
      'transactions.id',
      'accounts.identifier as account',
      'transactions.date',
      'transactions.description',
      'transactions.amount',
      'transactions.category',
      'transactions.subcategory',
      'transactions.category_source',
      'transactions.one_time_event_id'
    )
    .orderBy('transactions.date', 'asc')
    .orderBy('transactions.id', 'asc');
}

async function resolveEventId(knex) {
  const event = await knex('one_time_events')
    .where({ event_key: ONE_TIME_EVENT_KEY })
    .select('id')
    .first();
  if (!event) {
    throw new Error(`Missing one-time event: ${ONE_TIME_EVENT_KEY}`);
  }
  return event.id;
}

function buildReport({ matches, ambiguous, unmatchedPackets, unmatchedTransactions, applied, dryRun, windowDays }) {
  const lines = [];
  lines.push('# Supervisor Amazon Packet Application');
  lines.push('');
  lines.push(`Mode: ${dryRun ? 'dry run' : 'applied'}`);
  lines.push(`Date window: +/- ${windowDays} days`);
  lines.push(`Matched groups: ${matches.length}`);
  lines.push(`Transactions updated: ${applied.length}`);
  lines.push(`Unmatched packet rows: ${unmatchedPackets.length}`);
  lines.push(`Unmatched Amazon transactions: ${unmatchedTransactions.length}`);
  lines.push('');

  lines.push('## Matched Groups');
  lines.push('');
  if (!matches.length) {
    lines.push('(none)');
  } else {
    for (const match of matches) {
      lines.push(`- ${match.match_type}: packets ${match.packet_ids.join(', ')} -> transactions ${match.transaction_ids.join(', ')}`);
      lines.push(`  - destination: ${match.destination.category}${match.destination.subcategory ? ` / ${match.destination.subcategory}` : ''}`);
      for (const packet of match.packets) {
        lines.push(`  - packet ${packet.packet_id}: ${packet.date} ${amountDollars(packet.amount_cents)} ${packet.note}`);
      }
      for (const tx of match.transactions) {
        lines.push(`  - tx ${tx.id}: ${tx.date} ${amountDollars(amountCents(tx.amount))} ${tx.description}`);
      }
    }
  }

  lines.push('');
  lines.push('## Ambiguous Matches');
  lines.push('');
  if (!ambiguous.length) {
    lines.push('(none)');
  } else {
    for (const row of ambiguous) {
      lines.push(`- ${row.reason}`);
      if (row.packet) {
        lines.push(`  - packet ${row.packet.packet_id}: ${row.packet.date} ${amountDollars(row.packet.amount_cents)} ${row.packet.note}`);
      }
      if (row.transaction) {
        lines.push(`  - tx ${row.transaction.id}: ${row.transaction.date} ${amountDollars(amountCents(row.transaction.amount))} ${row.transaction.description}`);
      }
      for (const candidate of row.candidates || []) {
        if (candidate.packet_id) {
          lines.push(`  - candidate packet ${candidate.packet_id}: ${candidate.date} ${amountDollars(candidate.amount_cents)} ${candidate.note}`);
        } else {
          lines.push(`  - candidate tx ${candidate.id}: ${candidate.date} ${amountDollars(amountCents(candidate.amount))} ${candidate.description}`);
        }
      }
    }
  }

  lines.push('');
  lines.push('## Unmatched Packet Rows');
  lines.push('');
  if (!unmatchedPackets.length) {
    lines.push('(none)');
  } else {
    for (const packet of unmatchedPackets) {
      lines.push(`- ${packet.packet_id}: ${packet.date} ${amountDollars(packet.amount_cents)} -> ${packet.note}`);
    }
  }

  lines.push('');
  lines.push('## Unmatched Amazon Transactions');
  lines.push('');
  if (!unmatchedTransactions.length) {
    lines.push('(none)');
  } else {
    for (const tx of unmatchedTransactions) {
      lines.push(`- tx ${tx.id}: ${tx.date} ${amountDollars(amountCents(tx.amount))} ${tx.description}`);
    }
  }

  return lines.join('\n') + '\n';
}

async function applyMatches(knex, matches) {
  const ts = nowEpoch();
  const applied = [];

  for (const match of matches) {
    for (const tx of match.transactions) {
      if (tx.category_source === 'manual_override') continue;
      await knex('transactions')
        .where({ id: tx.id })
        .update({
          category: match.destination.category,
          subcategory: match.destination.subcategory,
          one_time_event_id: match.destination.one_time_event_id,
          category_source: 'manual_override',
          updated_at: ts,
        });
      applied.push({
        transaction_id: tx.id,
        category: match.destination.category,
        subcategory: match.destination.subcategory,
        one_time_event_id: match.destination.one_time_event_id,
      });
    }
  }

  return applied;
}

async function main() {
  const apply = hasFlag('apply');
  const windowDays = Number(getArg('window-days') || DEFAULT_WINDOW_DAYS);
  const outPath = getArg('out');
  const knex = getKnex();

  try {
    const eventId = await resolveEventId(knex);
    const packetRows = PACKET.map((packet) => ({
      ...packet,
      destination: destinationFor(packet, eventId),
    }));
    const txRows = await fetchAmazonTransactions(knex);

    const firstPass = chooseSinglePacketMatches(packetRows, txRows, windowDays);
    const state = {
      usedTxIds: firstPass.usedTxIds,
      matchedPacketIds: firstPass.matchedPacketIds,
    };
    const secondPass = chooseSinglePacketToTransactionCombos(packetRows, txRows, state, windowDays);
    const thirdPass = choosePacketCombosToSingleTransaction(packetRows, txRows, state, windowDays);

    const matches = [...firstPass.matches, ...secondPass.matches, ...thirdPass.matches];
    const ambiguous = [...firstPass.ambiguous, ...secondPass.ambiguous, ...thirdPass.ambiguous];
    const unmatchedPackets = packetRows.filter((packet) => !state.matchedPacketIds.has(packet.packet_id));
    const unmatchedTransactions = txRows.filter((tx) => !state.usedTxIds.has(tx.id));
    const applied = apply ? await applyMatches(knex, matches) : [];

    const report = buildReport({
      matches,
      ambiguous,
      unmatchedPackets,
      unmatchedTransactions,
      applied,
      dryRun: !apply,
      windowDays,
    });

    if (outPath) {
      const absoluteOut = path.resolve(outPath);
      fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
      fs.writeFileSync(absoluteOut, report, 'utf8');
      console.log(`Wrote report: ${absoluteOut}`);
    }

    console.log(JSON.stringify({
      ok: true,
      dry_run: !apply,
      matched_groups: matches.length,
      ambiguous_groups: ambiguous.length,
      unmatched_packet_rows: unmatchedPackets.length,
      unmatched_amazon_transactions: unmatchedTransactions.length,
      transactions_updated: applied.length,
    }, null, 2));
  } finally {
    await knex.destroy();
  }
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
