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

const HOST = process.env.AD_HOC_HOST || '127.0.0.1';
const PORT = parseInt(process.env.AD_HOC_PORT || '8791', 10);
const STATIC_ROOT = path.resolve(__dirname, '..', 'src', 'ad-hoc', 'static');
const API_SUMMARY_PATH = '/api/ad-hoc/month-buckets';

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
      transactions: details.transactions,
    });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
  }
}

async function requestHandler(req, res) {
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  if (method !== 'GET') {
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
    redirect(res, '/ad-hoc/month-buckets');
    return;
  }

  if (pathname === '/ad-hoc' || pathname === '/ad-hoc/') {
    redirect(res, '/ad-hoc/month-buckets');
    return;
  }

  if (pathname === '/ad-hoc/month-buckets' || pathname === '/ad-hoc/month-buckets.html') {
    sendHtml(res, renderMonthBucketsPage());
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

  const detailMatch = pathname.match(/^\/api\/ad-hoc\/month-buckets\/([^/]+)\/transactions$/);
  if (detailMatch) {
    await handleDetailRequest(res, url, detailMatch[1]);
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
  console.log(`Open: http://${HOST}:${PORT}/ad-hoc/month-buckets`);
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
