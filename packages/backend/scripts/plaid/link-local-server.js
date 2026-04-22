#!/usr/bin/env node
/**
 * Minimal local HTTP server for Plaid Link: creates link_token, exchanges public_token,
 * appends Item metadata + access_token to ~/.myknees/backend/secrets/plaid-items.json
 *
 * Usage (from packages/backend):
 *   PLAID_CLIENT_ID=... PLAID_SECRET=... PLAID_ENV=sandbox node scripts/plaid/link-local-server.js
 *
 * Open http://127.0.0.1:8765 (or PLAID_LINK_PORT) in a browser, complete Link, then edit
 * secrets/plaid-account-map.json to map each Plaid account_id → MyKnees account + format.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createPlaidClient } = require('./lib/plaid-client');
const { ensureSecretsDir, itemsPath } = require('./lib/paths');

const PORT = parseInt(process.env.PLAID_LINK_PORT || '8765', 10);
const HOST = process.env.PLAID_LINK_HOST || '127.0.0.1';

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeItems(data) {
  ensureSecretsDir();
  fs.writeFileSync(itemsPath(), JSON.stringify(data, null, 2), 'utf8');
}

function mergeItem(newEntry) {
  const cur = readJson(itemsPath()) || { version: 1, items: [] };
  const items = Array.isArray(cur.items) ? cur.items : [];
  const idx = items.findIndex((x) => x.item_id === newEntry.item_id);
  if (idx >= 0) items[idx] = newEntry;
  else items.push(newEntry);
  writeItems({ version: 1, items });
}

function htmlPage(linkToken) {
  const tokenJson = JSON.stringify(linkToken);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>MyKnees Plaid Link</title></head>
<body>
  <h1>MyKnees — Plaid Link</h1>
  <p>Open your bank, sign in, pick accounts. When finished, this page will save the Item under <code>~/.myknees/backend/secrets/</code>.</p>
  <button id="link-btn" type="button">Connect bank</button>
  <pre id="out"></pre>
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
  <script>
    const linkToken = ${tokenJson};
    const out = document.getElementById('out');
    document.getElementById('link-btn').onclick = function () {
      const handler = Plaid.create({
        token: linkToken,
        onSuccess: function (public_token, metadata) {
          out.textContent = 'Exchanging token…';
          fetch('/api/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token, metadata }),
          })
            .then(function (r) { return r.json(); })
            .then(function (j) {
              out.textContent = JSON.stringify(j, null, 2);
            })
            .catch(function (e) {
              out.textContent = String(e);
            });
        },
        onExit: function (err) {
          if (err) out.textContent = 'Exit: ' + JSON.stringify(err);
        },
      });
      handler.open();
    };
  </script>
</body></html>`;
}

async function main() {
  let client;
  try {
    client = createPlaidClient();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/') {
      try {
        const { data } = await client.linkTokenCreate({
          user: { client_user_id: process.env.PLAID_CLIENT_USER_ID || 'myknees-local-user' },
          client_name: process.env.PLAID_CLIENT_NAME || 'MyKnees',
          products: ['transactions'],
          country_codes: ['US'],
          language: 'en',
        });
        const lt = data.link_token;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage(lt));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('linkTokenCreate failed: ' + (e.response?.data ? JSON.stringify(e.response.data) : e.message));
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/exchange') {
      let body = '';
      for await (const chunk of req) body += chunk;
      let json;
      try {
        json = JSON.parse(body || '{}');
      } catch (_) {
        res.writeHead(400);
        res.end('invalid json');
        return;
      }
      const { public_token, metadata } = json;
      if (!public_token) {
        res.writeHead(400);
        res.end('missing public_token');
        return;
      }
      try {
        const ex = await client.itemPublicTokenExchange({ public_token });
        const access_token = ex.data.access_token;
        const item_id = ex.data.item_id;

        const acct = await client.accountsGet({ access_token });
        const accounts = (acct.data.accounts || []).map((a) => ({
          plaid_account_id: a.account_id,
          name: a.name,
          mask: a.mask,
          type: a.type,
          subtype: a.subtype,
        }));

        const entry = {
          item_id,
          access_token,
          institution_id: metadata?.institution?.institution_id || null,
          institution_name: metadata?.institution?.name || null,
          linked_at: new Date().toISOString(),
          accounts,
        };
        mergeItem(entry);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              ok: true,
              item_id,
              accounts,
              message:
                'Saved to secrets/plaid-items.json. Map each plaid_account_id in secrets/plaid-account-map.json, then run: npm run plaid:sync',
            },
            null,
            2
          )
        );
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.response?.data || e.message }));
      }
      return;
    }

    res.writeHead(404);
    res.end('not found');
  });

  server.listen(PORT, HOST, () => {
    console.log(`Plaid Link server: http://${HOST}:${PORT}`);
    console.log('Complete Link in the browser; then configure secrets/plaid-account-map.json');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
