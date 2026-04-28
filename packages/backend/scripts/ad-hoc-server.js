#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const { destroyKnex, getKnex } = require('../src/db/knex');
const {
  resolveMonthWindow,
  fetchMonthBucketData,
  getBucketDetails,
} = require('../src/ad-hoc/month-bucket-service');
const { renderMonthBucketsPage } = require('../src/ad-hoc/month-buckets-page');
const { renderCategoryTrendsPage } = require('../src/ad-hoc/category-trends-page');
const {
  fetchCategoryCatalog,
  fetchCategoryTrend,
  fetchCategoryMonthDetails,
} = require('../src/ad-hoc/category-trend-service');
const { fetchAllTransactionsMonthData } = require('../src/ad-hoc/all-transactions-service');
const { renderProjectionPage } = require('../src/ad-hoc/projection-page');
const { renderProjectionScenarioPage } = require('../src/ad-hoc/projection-scenario-page');
const { renderRecurringReviewPage } = require('../src/ad-hoc/recurring-review-page');
const { renderTransactionsPage } = require('../src/ad-hoc/transactions-page');
const {
  listProjectionProfiles,
  listProjectionAnchors,
  listInferredCandidates,
  refreshInferredCandidates,
  generateForecast,
  updateProjectionProfile,
  listProjectionCategoryDefaults,
  estimateCreditBalanceProjection,
} = require('../src/ad-hoc/projection-service');
const {
  listRecurringCandidates,
  getRecurringCandidateTransactions,
} = require('../src/ad-hoc/recurring-review-service');
const {
  listCategoryOptions,
  updateTransactionCategoryOverride,
} = require('../src/ad-hoc/transaction-category-service');

const HOST = process.env.AD_HOC_HOST || '127.0.0.1';
const PORT = parseInt(process.env.AD_HOC_PORT || '8791', 10);
const STATIC_ROOT = path.resolve(__dirname, '..', 'src', 'ad-hoc', 'static');
const API_SUMMARY_PATH = '/api/ad-hoc/month-buckets';
const API_TRANSACTIONS_PATH = '/api/ad-hoc/transactions';
const API_CATEGORY_CATALOG_PATH = '/api/ad-hoc/category-trends/categories';
const API_CATEGORY_TRENDS_PATH = '/api/ad-hoc/category-trends';
const API_PROJECTION_PROFILES_PATH = '/api/ad-hoc/projections/profiles';
const API_PROJECTION_ANCHORS_PATH = '/api/ad-hoc/projections/anchors';
const API_PROJECTION_FORECAST_PATH = '/api/ad-hoc/projections/forecast';
const API_PROJECTION_CATEGORY_DEFAULTS_PATH = '/api/ad-hoc/projections/category-defaults';
const API_PROJECTION_CREDIT_BALANCE_PATH = '/api/ad-hoc/projections/credit-balance';
const API_PROJECTION_CANDIDATES_PATH = '/api/ad-hoc/projections/inferred-candidates';
const API_PROJECTION_CANDIDATE_REFRESH_PATH = '/api/ad-hoc/projections/inferred-candidates/refresh';
const API_RECURRING_CANDIDATES_PATH = '/api/ad-hoc/recurring-review/candidates';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendHtml(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
}

async function readJsonBody(req) {
  const chunks = [];
  let bytesRead = 0;
  const maxBytes = 1024 * 1024;

  for await (const chunk of req) {
    bytesRead += chunk.length;
    if (bytesRead > maxBytes) {
      throw new Error('Request body too large (max 1MB).');
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  const bodyText = Buffer.concat(chunks).toString('utf8').trim();
  if (!bodyText) return {};

  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch (_err) {
    throw new Error('Request body must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request body must be a JSON object.');
  }

  return parsed;
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function staticContentType(fileName) {
  if (fileName.endsWith('.css')) return 'text/css; charset=utf-8';
  if (fileName.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (fileName.endsWith('.html')) return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}

function serveStaticAsset(res, urlPath) {
  const relativePath = urlPath.replace(/^\/ad-hoc\/static\//, '');
  if (!relativePath || relativePath.includes('..')) {
    sendNotFound(res);
    return;
  }

  const filePath = path.resolve(STATIC_ROOT, relativePath);
  if (!filePath.startsWith(STATIC_ROOT + path.sep)) {
    sendNotFound(res);
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendNotFound(res);
    return;
  }

  const contents = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': staticContentType(filePath),
    'Cache-Control': 'no-store',
  });
  res.end(contents);
}

async function handleSummaryRequest(res, url) {
  let monthWindow;
  try {
    monthWindow = resolveMonthWindow(url.searchParams);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
    return;
  }

  try {
    const report = await fetchMonthBucketData(getKnex(), monthWindow);
    sendJson(res, 200, {
      ok: true,
      window: report.window,
      include_linked: report.include_linked,
      format_filter: report.format_filter,
      scanned_transaction_count: report.scanned_transaction_count,
      skipped_by_format: report.skipped_by_format,
      linked_target_count: report.linked_target_count,
      totals: report.totals,
      buckets: report.buckets,
    });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
  }
}

async function handleDetailRequest(res, url, encodedBucket) {
  let bucket;
  try {
    bucket = decodeURIComponent(encodedBucket);
  } catch (_err) {
    sendJson(res, 400, { ok: false, error: 'Bucket path is not valid URL encoding.' });
    return;
  }

  let monthWindow;
  try {
    monthWindow = resolveMonthWindow(url.searchParams);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
    return;
  }

  try {
    const report = await fetchMonthBucketData(getKnex(), monthWindow);
    const details = getBucketDetails(report, bucket);

    sendJson(res, 200, {
      ok: true,
      window: report.window,
      include_linked: report.include_linked,
      bucket: details.bucket,
      transaction_count: details.transaction_count,
      total_amount: details.total_amount,
      category_options: await listCategoryOptions(getKnex()),
      transactions: details.transactions,
    });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
  }
}

async function handleCategoryCatalogRequest(res, url) {
  try {
    const payload = await fetchCategoryCatalog(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      canonical_cutoff: payload.canonical_cutoff,
      range: payload.range,
      include_linked: payload.include_linked,
      format_filter: payload.format_filter,
      available_months: payload.available_months,
      categories: payload.categories,
      default_category_key: payload.default_category_key,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleCategoryTrendRequest(res, url) {
  const categoryKey = url.searchParams.get('category');
  if (!categoryKey || !String(categoryKey).trim()) {
    sendJson(res, 400, {
      ok: false,
      error: 'Query parameter "category" is required.',
    });
    return;
  }

  try {
    const payload = await fetchCategoryTrend(getKnex(), url.searchParams, categoryKey);
    sendJson(res, 200, {
      ok: true,
      canonical_cutoff: payload.canonical_cutoff,
      range: payload.range,
      include_linked: payload.include_linked,
      format_filter: payload.format_filter,
      available_months: payload.available_months,
      category: payload.category,
      totals: payload.totals,
      months: payload.months,
      category_found_in_range: payload.category_found_in_range,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleCategoryMonthDetailRequest(res, encodedCategory, monthKey) {
  let categoryKey;
  try {
    categoryKey = decodeURIComponent(encodedCategory);
  } catch (_err) {
    sendJson(res, 400, { ok: false, error: 'Category path is not valid URL encoding.' });
    return;
  }

  try {
    const payload = await fetchCategoryMonthDetails(getKnex(), categoryKey, monthKey);
    sendJson(res, 200, {
      ok: true,
      category: payload.category,
      window: payload.window,
      transaction_count: payload.transaction_count,
      total_amount: payload.total_amount,
      month_bucket_browser_path: payload.month_bucket_browser_path,
      category_options: await listCategoryOptions(getKnex()),
      transactions: payload.transactions,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleTransactionCategoryOverrideRequest(req, res, encodedTransactionId) {
  let transactionId;
  try {
    transactionId = Number(decodeURIComponent(encodedTransactionId));
  } catch (_err) {
    sendJson(res, 400, { ok: false, error: 'Transaction path is not valid URL encoding.' });
    return;
  }

  if (!Number.isInteger(transactionId) || transactionId < 1) {
    sendJson(res, 400, { ok: false, error: 'Transaction id must be a positive integer.' });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
    return;
  }

  try {
    const result = await updateTransactionCategoryOverride(getKnex(), transactionId, payload);
    sendJson(res, 200, {
      ok: true,
      transaction: result.transaction,
      category_options: result.category_options,
      rule_result: result.rule_result,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleTransactionsRequest(res, url) {
  try {
    const payload = await fetchAllTransactionsMonthData(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      window: payload.window,
      include_linked: payload.include_linked,
      format_filter: payload.format_filter,
      scanned_transaction_count: payload.scanned_transaction_count,
      skipped_by_format: payload.skipped_by_format,
      linked_target_count: payload.linked_target_count,
      account_filter: payload.account_filter,
      selected_account: payload.selected_account,
      available_accounts: payload.available_accounts,
      month_transaction_count_all_accounts: payload.month_transaction_count_all_accounts,
      month_total_amount_all_accounts: payload.month_total_amount_all_accounts,
      transaction_count: payload.transaction_count,
      total_amount: payload.total_amount,
      category_options: await listCategoryOptions(getKnex()),
      transactions: payload.transactions,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleProjectionProfilesRequest(res, url) {
  try {
    const payload = await listProjectionProfiles(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      account_identifier: payload.account_identifier,
      sign_convention: payload.sign_convention,
      profiles: payload.profiles,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleProjectionAnchorsRequest(res, url) {
  try {
    const payload = await listProjectionAnchors(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      account_identifier: payload.account_identifier,
      anchors: payload.anchors,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleProjectionCandidatesRequest(res, url) {
  try {
    const payload = await listInferredCandidates(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      account_identifier: payload.account_identifier,
      candidate_count: payload.candidate_count,
      candidates: payload.candidates,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleProjectionCandidateRefreshRequest(res, url) {
  try {
    const payload = await refreshInferredCandidates(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      account_identifier: payload.account_identifier,
      inference_window: payload.inference_window,
      candidate_count: payload.candidate_count,
      candidates: payload.candidates,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleProjectionForecastRequest(res, url) {
  try {
    const payload = await generateForecast(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      account_identifier: payload.account_identifier,
      sign_convention: payload.sign_convention,
      forecast_window: payload.forecast_window,
      anchor: payload.anchor,
      effective_anchor_balance: payload.effective_anchor_balance,
      totals: payload.totals,
      month_totals: payload.month_totals,
      rows: payload.rows,
      assumptions: payload.assumptions,
      scenario_answer: payload.scenario_answer,
      applied_overrides: payload.applied_overrides,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleProjectionForecastPostRequest(req, res, url) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
    return;
  }

  try {
    const payload = await generateForecast(getKnex(), url.searchParams, {
      scenario_overrides: body.scenario_overrides || body.overrides || body,
    });
    sendJson(res, 200, {
      ok: true,
      account_identifier: payload.account_identifier,
      sign_convention: payload.sign_convention,
      forecast_window: payload.forecast_window,
      anchor: payload.anchor,
      effective_anchor_balance: payload.effective_anchor_balance,
      totals: payload.totals,
      month_totals: payload.month_totals,
      rows: payload.rows,
      assumptions: payload.assumptions,
      scenario_answer: payload.scenario_answer,
      applied_overrides: payload.applied_overrides,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleProjectionCategoryDefaultsRequest(res, url) {
  try {
    const payload = await listProjectionCategoryDefaults(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      account_identifier: payload.account_identifier,
      category_window: payload.category_window,
      categories: payload.categories,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleProjectionCreditBalanceRequest(res, url) {
  try {
    const payload = await estimateCreditBalanceProjection(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      account_identifier: payload.account_identifier,
      account_name: payload.account_name,
      account_type: payload.account_type,
      credit_limit: payload.credit_limit,
      current_debt_balance: payload.current_debt_balance,
      signed_transaction_balance: payload.signed_transaction_balance,
      latest_transaction_date: payload.latest_transaction_date,
      forecast_window: payload.forecast_window,
      lookback_window: payload.lookback_window,
      months: payload.months,
      limit_crossing_month: payload.limit_crossing_month,
      source_note: payload.source_note,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleProjectionProfileUpdateRequest(req, res, encodedProfileKey) {
  let profileKey;
  try {
    profileKey = decodeURIComponent(encodedProfileKey);
  } catch (_err) {
    sendJson(res, 400, { ok: false, error: 'Profile path is not valid URL encoding.' });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
    return;
  }

  try {
    const result = await updateProjectionProfile(getKnex(), profileKey, payload);
    sendJson(res, 200, {
      ok: true,
      account_identifier: result.account_identifier,
      profile: result.profile,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleRecurringCandidatesRequest(res, url) {
  try {
    const payload = await listRecurringCandidates(getKnex(), url.searchParams);
    sendJson(res, 200, {
      ok: true,
      account_identifiers: payload.account_identifiers,
      account_selection: payload.account_selection,
      canonical_window: payload.canonical_window,
      detection_criteria: payload.detection_criteria,
      scanned_transaction_count: payload.scanned_transaction_count,
      skipped_by_format: payload.skipped_by_format,
      format_filter: payload.format_filter,
      applied_filters: payload.applied_filters,
      totals: payload.totals,
      candidates: payload.candidates,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function handleRecurringCandidateTransactionsRequest(res, url, encodedCandidateId) {
  let candidateId;
  try {
    candidateId = decodeURIComponent(encodedCandidateId);
  } catch (_err) {
    sendJson(res, 400, { ok: false, error: 'Candidate path is not valid URL encoding.' });
    return;
  }

  try {
    const payload = await getRecurringCandidateTransactions(getKnex(), url.searchParams, candidateId);
    sendJson(res, 200, {
      ok: true,
      account_identifiers: payload.account_identifiers,
      account_selection: payload.account_selection,
      canonical_window: payload.canonical_window,
      candidate: payload.candidate,
      transaction_count: payload.transaction_count,
      transactions: payload.transactions,
    });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message });
  }
}

async function requestHandler(req, res) {
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  if (method !== 'GET' && method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('method not allowed');
    return;
  }

  if (method === 'POST') {
    if (pathname === API_PROJECTION_FORECAST_PATH) {
      await handleProjectionForecastPostRequest(req, res, url);
      return;
    }

    if (pathname === API_PROJECTION_CANDIDATE_REFRESH_PATH) {
      await handleProjectionCandidateRefreshRequest(res, url);
      return;
    }

    const profileUpdateMatch = pathname.match(/^\/api\/ad-hoc\/projections\/profiles\/([^/]+)$/);
    if (profileUpdateMatch) {
      await handleProjectionProfileUpdateRequest(req, res, profileUpdateMatch[1]);
      return;
    }

    const transactionCategoryOverrideMatch = pathname.match(
      /^\/api\/ad-hoc\/transactions\/([^/]+)\/category-override$/
    );
    if (transactionCategoryOverrideMatch) {
      await handleTransactionCategoryOverrideRequest(req, res, transactionCategoryOverrideMatch[1]);
      return;
    }

    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('method not allowed');
    return;
  }

  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/') {
    redirect(res, '/ad-hoc/transactions');
    return;
  }

  if (pathname === '/ad-hoc' || pathname === '/ad-hoc/') {
    redirect(res, '/ad-hoc/transactions');
    return;
  }

  if (pathname === '/ad-hoc/transactions' || pathname === '/ad-hoc/transactions.html') {
    sendHtml(res, renderTransactionsPage());
    return;
  }

  if (pathname === '/ad-hoc/month-buckets' || pathname === '/ad-hoc/month-buckets.html') {
    sendHtml(res, renderMonthBucketsPage());
    return;
  }

  if (pathname === '/ad-hoc/category-trends' || pathname === '/ad-hoc/category-trends.html') {
    sendHtml(res, renderCategoryTrendsPage());
    return;
  }

  if (pathname === '/ad-hoc/projection-forecast' || pathname === '/ad-hoc/projection-forecast.html') {
    sendHtml(res, renderProjectionPage());
    return;
  }

  if (pathname === '/ad-hoc/projection-scenario' || pathname === '/ad-hoc/projection-scenario.html') {
    sendHtml(res, renderProjectionScenarioPage());
    return;
  }

  if (pathname === '/ad-hoc/recurring-review' || pathname === '/ad-hoc/recurring-review.html') {
    sendHtml(res, renderRecurringReviewPage());
    return;
  }

  if (pathname.startsWith('/ad-hoc/static/')) {
    serveStaticAsset(res, pathname);
    return;
  }

  if (pathname === API_SUMMARY_PATH) {
    await handleSummaryRequest(res, url);
    return;
  }

  if (pathname === API_TRANSACTIONS_PATH) {
    await handleTransactionsRequest(res, url);
    return;
  }

  if (pathname === API_CATEGORY_CATALOG_PATH) {
    await handleCategoryCatalogRequest(res, url);
    return;
  }

  if (pathname === API_CATEGORY_TRENDS_PATH) {
    await handleCategoryTrendRequest(res, url);
    return;
  }

  if (pathname === API_PROJECTION_PROFILES_PATH) {
    await handleProjectionProfilesRequest(res, url);
    return;
  }

  if (pathname === API_PROJECTION_ANCHORS_PATH) {
    await handleProjectionAnchorsRequest(res, url);
    return;
  }

  if (pathname === API_PROJECTION_CATEGORY_DEFAULTS_PATH) {
    await handleProjectionCategoryDefaultsRequest(res, url);
    return;
  }

  if (pathname === API_PROJECTION_CREDIT_BALANCE_PATH) {
    await handleProjectionCreditBalanceRequest(res, url);
    return;
  }

  if (pathname === API_PROJECTION_CANDIDATES_PATH) {
    await handleProjectionCandidatesRequest(res, url);
    return;
  }

  if (pathname === API_PROJECTION_FORECAST_PATH) {
    await handleProjectionForecastRequest(res, url);
    return;
  }

  if (pathname === API_RECURRING_CANDIDATES_PATH) {
    await handleRecurringCandidatesRequest(res, url);
    return;
  }

  const detailMatch = pathname.match(/^\/api\/ad-hoc\/month-buckets\/([^/]+)\/transactions$/);
  if (detailMatch) {
    await handleDetailRequest(res, url, detailMatch[1]);
    return;
  }

  const categoryDetailMatch = pathname.match(
    /^\/api\/ad-hoc\/category-trends\/([^/]+)\/months\/(\d{4}-\d{2})\/transactions$/
  );
  if (categoryDetailMatch) {
    await handleCategoryMonthDetailRequest(res, categoryDetailMatch[1], categoryDetailMatch[2]);
    return;
  }

  const recurringDetailMatch = pathname.match(
    /^\/api\/ad-hoc\/recurring-review\/candidates\/([^/]+)\/transactions$/
  );
  if (recurringDetailMatch) {
    await handleRecurringCandidateTransactionsRequest(res, url, recurringDetailMatch[1]);
    return;
  }

  sendNotFound(res);
}

const server = http.createServer((req, res) => {
  requestHandler(req, res).catch((err) => {
    sendJson(res, 500, { ok: false, error: err.message });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`MyKnees ad hoc server listening on http://${HOST}:${PORT}`);
  console.log(`Open: http://${HOST}:${PORT}/ad-hoc/transactions`);
  console.log(`Open: http://${HOST}:${PORT}/ad-hoc/month-buckets`);
  console.log(`Open: http://${HOST}:${PORT}/ad-hoc/category-trends`);
  console.log(`Open: http://${HOST}:${PORT}/ad-hoc/projection-forecast`);
  console.log(`Open: http://${HOST}:${PORT}/ad-hoc/projection-scenario`);
  console.log(`Open: http://${HOST}:${PORT}/ad-hoc/recurring-review`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down ad hoc server.`);
  server.close(async () => {
    await destroyKnex();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch(() => process.exit(1));
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch(() => process.exit(1));
});
