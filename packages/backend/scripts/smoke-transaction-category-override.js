#!/usr/bin/env node

const { getKnex } = require('../src/db/knex');
const {
  listCategoryOptions,
  updateTransactionCategoryOverride,
} = require('../src/ad-hoc/transaction-category-service');

const ROLLBACK_SENTINEL = 'ROLLBACK_CATEGORY_OVERRIDE_SMOKE_TEST';

async function pickSmokeTransaction(knex) {
  const tx = await knex('transactions')
    .whereNotNull('date')
    .select('id')
    .orderBy('date', 'desc')
    .orderBy('id', 'desc')
    .first();

  if (!tx) {
    throw new Error('No transaction rows are available for smoke testing.');
  }

  return tx.id;
}

async function main() {
  const knex = getKnex();
  let smokeResult = null;

  try {
    const transactionId = await pickSmokeTransaction(knex);

    await knex.transaction(async (trx) => {
      const categories = await listCategoryOptions(trx);
      if (!categories.length) {
        throw new Error('No classification categories are available for smoke testing.');
      }

      const cleared = await updateTransactionCategoryOverride(trx, transactionId, {
        mode: 'rule_based',
      });
      const defaultCategory = cleared.transaction.default_rule_category;
      const overrideCategory = categories.find(
        (category) =>
          category.option_type === 'category' &&
          category.category_key &&
          category.category_key !== defaultCategory &&
          category.category_key !== 'One-Time Event'
      );
      const overrideEvent = categories.find(
        (category) => category.option_type === 'one_time_event' && category.one_time_event_id
      );

      if (!overrideCategory) {
        throw new Error('Could not find a category different from the default rule category.');
      }
      if (!overrideEvent) {
        throw new Error('Could not find a one-time event option for smoke testing.');
      }

      const overridden = await updateTransactionCategoryOverride(trx, transactionId, {
        category: overrideCategory.category_key,
      });

      if (overridden.transaction.category_source !== 'manual_override') {
        throw new Error('Expected manual_override category_source after saving override.');
      }
      if (overridden.transaction.effective_category !== overrideCategory.category_key) {
        throw new Error('Expected effective_category to match saved override category.');
      }
      if (overridden.transaction.default_rule_category !== defaultCategory) {
        throw new Error('Expected default_rule_category to remain stable after override.');
      }

      const eventOverridden = await updateTransactionCategoryOverride(trx, transactionId, {
        category: overrideEvent.category_key,
        one_time_event_id: overrideEvent.one_time_event_id,
      });

      if (eventOverridden.transaction.category_source !== 'manual_override') {
        throw new Error('Expected manual_override category_source after saving one-time event.');
      }
      if (eventOverridden.transaction.effective_category !== 'One-Time Event') {
        throw new Error('Expected effective_category to be One-Time Event for one-time event override.');
      }
      if (eventOverridden.transaction.one_time_event_id !== overrideEvent.one_time_event_id) {
        throw new Error('Expected one_time_event_id to match saved event override.');
      }

      const ruleOverridden = await updateTransactionCategoryOverride(trx, transactionId, {
        category: overrideCategory.category_key,
        apply_as_rule: true,
      });

      if (ruleOverridden.transaction.category_source !== 'rule_based') {
        throw new Error('Expected rule_based category_source after saving general rule.');
      }
      if (ruleOverridden.transaction.rule_source !== 'rule_override') {
        throw new Error('Expected rule_override rule_source after saving general rule.');
      }
      if (!ruleOverridden.rule_result || ruleOverridden.rule_result.matching_transaction_count < 1) {
        throw new Error('Expected general rule to apply to at least the smoke transaction.');
      }

      const ruleRemoved = await updateTransactionCategoryOverride(trx, transactionId, {
        remove_general_rule: true,
      });

      if (!ruleRemoved.rule_result || ruleRemoved.rule_result.removed_rule !== true) {
        throw new Error('Expected general rule removal to report removed_rule=true.');
      }

      const restored = await updateTransactionCategoryOverride(trx, transactionId, {
        mode: 'rule_based',
      });

      if (restored.transaction.category_source !== 'rule_based') {
        throw new Error('Expected rule_based category_source after clearing override.');
      }
      if (restored.transaction.effective_category !== defaultCategory) {
        throw new Error('Expected effective_category to return to the default rule category.');
      }

      smokeResult = {
        transaction_id: transactionId,
        default_rule_category: defaultCategory,
        override_category: overrideCategory.category_key,
        override_one_time_event_id: overrideEvent.one_time_event_id,
        override_one_time_event: overrideEvent.one_time_event_display_name,
        verified_steps: [
          'clear_to_rule_based',
          'save_manual_override',
          'save_one_time_event_override',
          'save_general_rule_override',
          'remove_general_rule_override',
          'clear_back_to_rule_based',
        ],
        database_persisted: false,
      };

      throw new Error(ROLLBACK_SENTINEL);
    }).catch((err) => {
      if (err.message !== ROLLBACK_SENTINEL) {
        throw err;
      }
    });

    console.log(JSON.stringify({
      ok: true,
      result: smokeResult,
    }, null, 2));
  } finally {
    await knex.destroy();
  }
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
