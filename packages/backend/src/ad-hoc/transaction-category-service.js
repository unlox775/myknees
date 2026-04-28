const { getParser } = require('../classification');
const {
  loadCategoryMaps,
  loadOverrides,
  loadRuleOverrides,
  resolveTransactionCategory,
} = require('../classification/resolve-transaction-category');
const { nowEpoch } = require('../db/dates');
const { resolveFormatIdentifier } = require('../reconciliation/resolve-format');

const ONE_TIME_EVENT_CATEGORY = 'One-Time Event';

async function listCategoryOptions(knex) {
  const categoryRows = await knex('classification_categories')
    .select('name')
    .orderBy('id', 'asc');

  const options = categoryRows
    .filter((row) => row.name !== ONE_TIME_EVENT_CATEGORY)
    .map((row) => ({
      option_type: 'category',
      select_value: `category:${row.name}`,
      category_key: row.name,
      category_label: row.name,
      destination_label: row.name,
      one_time_event_id: null,
    }));

  const eventRows = await knex('one_time_events')
    .select('id', 'event_key', 'display_name', 'event_year', 'starts_on', 'ends_on', 'status')
    .orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
    .orderBy('event_year', 'desc')
    .orderBy('display_name', 'asc');

  for (const event of eventRows) {
    options.push({
      option_type: 'one_time_event',
      select_value: `event:${event.id}`,
      category_key: ONE_TIME_EVENT_CATEGORY,
      category_label: ONE_TIME_EVENT_CATEGORY,
      destination_label: `${ONE_TIME_EVENT_CATEGORY} / ${event.display_name}`,
      one_time_event_id: event.id,
      one_time_event_key: event.event_key,
      one_time_event_display_name: event.display_name,
      one_time_event_year: event.event_year,
      one_time_event_starts_on: event.starts_on,
      one_time_event_ends_on: event.ends_on,
      one_time_event_status: event.status,
    });
  }

  return options;
}

async function fetchTransactionForCategoryEdit(knex, transactionId) {
  const row = await knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .leftJoin('parse_formats', 'parse_formats.id', 'accounts.parse_format_id')
    .leftJoin('one_time_events', 'one_time_events.id', 'transactions.one_time_event_id')
    .where('transactions.id', transactionId)
    .select(
      'transactions.id',
      'transactions.account_id',
      'transactions.date',
      'transactions.description',
      'transactions.amount',
      'transactions.category',
      'transactions.notes',
      'transactions.category_source',
      'transactions.one_time_event_id',
      'parse_formats.id as parse_format_id',
      'accounts.identifier as account_identifier',
      'accounts.name as account_name',
      'parse_formats.identifier as parse_format_identifier',
      'one_time_events.event_key as one_time_event_key',
      'one_time_events.display_name as one_time_event_display_name',
      'one_time_events.event_year as one_time_event_year',
      'one_time_events.status as one_time_event_status'
    )
    .first();

  if (!row) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  return row;
}

async function resolveTransactionCategoryState(knex, tx) {
  const formatId = tx.parse_format_identifier || (await resolveFormatIdentifier(knex, tx.account_id));
  const parser = getParser(formatId);
  const rawDescription = tx.description || '';
  const normalizedDescription = parser
    ? parser.normalize(rawDescription)
    : rawDescription.trim().toLowerCase();
  const categoryMap = await loadCategoryMaps(knex);
  const overrideMap = await loadOverrides(knex);
  const ruleOverrideMap = await loadRuleOverrides(knex);
  const ruleResolved = resolveTransactionCategory(
    formatId,
    rawDescription,
    normalizedDescription,
    overrideMap,
    categoryMap,
    ruleOverrideMap
  );
  const hasManualOverride = tx.category_source === 'manual_override' && tx.category;
  const effectiveCategory = hasManualOverride ? tx.category : ruleResolved.category;
  const effectiveOneTimeEventId = hasManualOverride
    ? tx.one_time_event_id || null
    : ruleResolved.one_time_event_id || tx.one_time_event_id || null;

  return {
    transaction_id: tx.id,
    account_id: tx.account_id,
    account_identifier: tx.account_identifier,
    account_name: tx.account_name,
    date: tx.date,
    amount: Number(tx.amount) || 0,
    bucket: effectiveCategory,
    effective_category: effectiveCategory,
    default_rule_category: ruleResolved.category,
    category_source: hasManualOverride ? 'manual_override' : 'rule_based',
    rule_source: ruleResolved.source,
    parse_format_id: tx.parse_format_id || null,
    parse_format_identifier: formatId,
    one_time_event_id: effectiveOneTimeEventId,
    one_time_event_key: hasManualOverride ? tx.one_time_event_key || null : ruleResolved.one_time_event_key || tx.one_time_event_key || null,
    one_time_event_display_name: hasManualOverride ? tx.one_time_event_display_name || null : ruleResolved.one_time_event_display_name || tx.one_time_event_display_name || null,
    one_time_event_year: hasManualOverride ? tx.one_time_event_year || null : ruleResolved.one_time_event_year || tx.one_time_event_year || null,
    one_time_event_status: hasManualOverride ? tx.one_time_event_status || null : ruleResolved.one_time_event_status || tx.one_time_event_status || null,
    normalized_description: normalizedDescription,
    raw_description: rawDescription,
    notes: tx.notes || '',
  };
}

function cleanTransactionNotes(rawNotes) {
  if (rawNotes == null) return '';
  const notes = String(rawNotes).replace(/\r\n/g, '\n').trim();
  if (notes.length > 2000) {
    throw new Error('Transaction notes must be 2000 characters or fewer.');
  }
  return notes;
}

function parseOneTimeEventId(rawValue) {
  if (rawValue == null || rawValue === '') return null;
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('one_time_event_id must be a positive integer.');
  }
  return parsed;
}

async function requireOneTimeEvent(knex, oneTimeEventId) {
  const event = await knex('one_time_events')
    .where({ id: oneTimeEventId })
    .first();
  if (!event) {
    throw new Error(`Unknown one-time event id: ${oneTimeEventId}`);
  }
  return event;
}

async function requireCategoryId(knex, category) {
  const row = await knex('classification_categories')
    .where({ name: category })
    .select('id')
    .first();
  if (!row) {
    throw new Error(`Unknown category: ${category}`);
  }
  return row.id;
}

async function getParseFormatId(knex, formatIdentifier) {
  const row = await knex('parse_formats')
    .where({ identifier: formatIdentifier })
    .select('id')
    .first();
  if (!row) {
    throw new Error(`Unknown parse format: ${formatIdentifier}`);
  }
  return row.id;
}

async function matchingNonManualTransactionIds(knex, formatId, normalizedDescription) {
  const rows = await knex('transactions')
    .join('accounts', 'accounts.id', 'transactions.account_id')
    .leftJoin('parse_formats', 'parse_formats.id', 'accounts.parse_format_id')
    .where((builder) => {
      builder
        .whereNull('transactions.category_source')
        .orWhere('transactions.category_source', '<>', 'manual_override');
    })
    .select(
      'transactions.id',
      'transactions.description',
      'parse_formats.identifier as parse_format_identifier'
    );

  const matchingIds = [];
  for (const row of rows) {
    const rowFormatId = row.parse_format_identifier;
    if (rowFormatId !== formatId) continue;

    const parser = getParser(rowFormatId);
    const rawDescription = row.description || '';
    const rowNormalized = parser
      ? parser.normalize(rawDescription)
      : rawDescription.trim().toLowerCase();
    if (rowNormalized === normalizedDescription) {
      matchingIds.push(row.id);
    }
  }

  return matchingIds;
}

async function saveRuleOverride(knex, txState, category, oneTimeEventId) {
  const ts = nowEpoch();
  const parseFormatId = txState.parse_format_id || (await getParseFormatId(knex, txState.parse_format_identifier));
  const categoryId = await requireCategoryId(knex, category);
  const existing = await knex('classification_rule_overrides')
    .where({
      parse_format_id: parseFormatId,
      normalized_value: txState.normalized_description,
    })
    .first();

  const values = {
    parse_format_id: parseFormatId,
    normalized_value: txState.normalized_description,
    category_id: categoryId,
    one_time_event_id: oneTimeEventId,
    updated_at: ts,
  };

  if (existing) {
    await knex('classification_rule_overrides')
      .where({ id: existing.id })
      .update(values);
  } else {
    await knex('classification_rule_overrides').insert({
      ...values,
      created_at: ts,
    });
  }

  const matchingIds = await matchingNonManualTransactionIds(
    knex,
    txState.parse_format_identifier,
    txState.normalized_description
  );
  if (!matchingIds.includes(txState.transaction_id)) {
    matchingIds.push(txState.transaction_id);
  }

  if (matchingIds.length > 0) {
    await knex('transactions')
      .whereIn('id', matchingIds)
      .update({
        category,
        one_time_event_id: oneTimeEventId,
        category_source: 'rule_based',
        updated_at: ts,
      });
  }

  return {
    matching_transaction_count: matchingIds.length,
  };
}

async function removeRuleOverride(knex, txState) {
  const ts = nowEpoch();
  const parseFormatId = txState.parse_format_id || (await getParseFormatId(knex, txState.parse_format_identifier));
  const existing = await knex('classification_rule_overrides')
    .where({
      parse_format_id: parseFormatId,
      normalized_value: txState.normalized_description,
    })
    .first();

  if (!existing) {
    return {
      removed_rule: false,
      matching_transaction_count: 0,
    };
  }

  const matchingIds = await matchingNonManualTransactionIds(
    knex,
    txState.parse_format_identifier,
    txState.normalized_description
  );

  await knex('classification_rule_overrides')
    .where({ id: existing.id })
    .delete();

  const categoryMap = await loadCategoryMaps(knex);
  const overrideMap = await loadOverrides(knex);
  const ruleOverrideMap = await loadRuleOverrides(knex);

  for (const id of matchingIds) {
    const tx = await fetchTransactionForCategoryEdit(knex, id);
    const parser = getParser(tx.parse_format_identifier);
    const rawDescription = tx.description || '';
    const normalizedDescription = parser
      ? parser.normalize(rawDescription)
      : rawDescription.trim().toLowerCase();
    const resolved = resolveTransactionCategory(
      tx.parse_format_identifier,
      rawDescription,
      normalizedDescription,
      overrideMap,
      categoryMap,
      ruleOverrideMap
    );

    await knex('transactions')
      .where({ id })
      .update({
        category: resolved.category,
        one_time_event_id: resolved.one_time_event_id || null,
        category_source: 'rule_based',
        updated_at: ts,
      });
  }

  return {
    removed_rule: true,
    matching_transaction_count: matchingIds.length,
  };
}

async function updateTransactionCategoryOverride(knex, transactionId, payload = {}) {
  if (!Number.isInteger(transactionId) || transactionId < 1) {
    throw new Error('Transaction id must be a positive integer.');
  }

  const mode = String(payload.mode || '').trim();
  const rawCategory = payload.category == null ? '' : String(payload.category).trim();
  const oneTimeEventId = parseOneTimeEventId(payload.one_time_event_id);
  const applyAsRule = Boolean(payload.apply_as_rule);
  const removeGeneralRule = Boolean(payload.remove_general_rule);
  const useRuleBased = mode === 'rule_based' || rawCategory === '';
  const before = await fetchTransactionForCategoryEdit(knex, transactionId);
  const beforeState = await resolveTransactionCategoryState(knex, before);
  const ts = nowEpoch();

  let rule_result = null;

  if (removeGeneralRule) {
    rule_result = await removeRuleOverride(knex, beforeState);
  } else if (applyAsRule) {
    if (useRuleBased) {
      throw new Error('Choose a category before saving a general rule.');
    }
    if (rawCategory === ONE_TIME_EVENT_CATEGORY && oneTimeEventId == null) {
      throw new Error(`Category "${ONE_TIME_EVENT_CATEGORY}" requires one_time_event_id.`);
    }
    if (oneTimeEventId != null) {
      await requireOneTimeEvent(knex, oneTimeEventId);
      if (rawCategory !== ONE_TIME_EVENT_CATEGORY) {
        throw new Error(`one_time_event_id can only be set with category "${ONE_TIME_EVENT_CATEGORY}".`);
      }
    }

    rule_result = await saveRuleOverride(knex, beforeState, rawCategory, oneTimeEventId);
  } else if (useRuleBased) {

    await knex('transactions')
      .where({ id: transactionId })
      .update({
        category: beforeState.default_rule_category,
        category_source: 'rule_based',
        one_time_event_id: null,
        updated_at: ts,
      });
  } else {
    const validCategories = await listCategoryOptions(knex);
    const validCategoryNames = new Set(validCategories.map((row) => row.category_key));
    if (!validCategoryNames.has(rawCategory)) {
      throw new Error(`Unknown category: ${rawCategory}`);
    }
    if (rawCategory === ONE_TIME_EVENT_CATEGORY && oneTimeEventId == null) {
      throw new Error(`Category "${ONE_TIME_EVENT_CATEGORY}" requires one_time_event_id.`);
    }
    if (oneTimeEventId != null) {
      await requireOneTimeEvent(knex, oneTimeEventId);
      if (rawCategory !== ONE_TIME_EVENT_CATEGORY) {
        throw new Error(`one_time_event_id can only be set with category "${ONE_TIME_EVENT_CATEGORY}".`);
      }
    }

    await knex('transactions')
      .where({ id: transactionId })
      .update({
        category: rawCategory,
        category_source: 'manual_override',
        one_time_event_id: oneTimeEventId,
        updated_at: ts,
      });
  }

  const after = await fetchTransactionForCategoryEdit(knex, transactionId);
  const transaction = await resolveTransactionCategoryState(knex, after);

  return {
    transaction,
    category_options: await listCategoryOptions(knex),
    rule_result,
  };
}

async function updateTransactionNotes(knex, transactionId, payload = {}) {
  if (!Number.isInteger(transactionId) || transactionId < 1) {
    throw new Error('Transaction id must be a positive integer.');
  }

  const notes = cleanTransactionNotes(payload.notes);
  await fetchTransactionForCategoryEdit(knex, transactionId);
  await knex('transactions')
    .where({ id: transactionId })
    .update({
      notes: notes || null,
      updated_at: nowEpoch(),
    });

  const after = await fetchTransactionForCategoryEdit(knex, transactionId);
  return {
    transaction: await resolveTransactionCategoryState(knex, after),
  };
}

module.exports = {
  listCategoryOptions,
  updateTransactionCategoryOverride,
  updateTransactionNotes,
};
