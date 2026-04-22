const path = require('path');
const fs = require('fs');
const { getMykneesRoot, ensureMykneesDirs } = require('../../../src/config');

function getSecretsDir() {
  return path.join(getMykneesRoot(), 'secrets');
}

function ensureSecretsDir() {
  ensureMykneesDirs();
  const d = getSecretsDir();
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function itemsPath() {
  return path.join(getSecretsDir(), 'plaid-items.json');
}

function accountMapPath() {
  return path.join(getSecretsDir(), 'plaid-account-map.json');
}

function cursorsPath() {
  return path.join(getSecretsDir(), 'plaid-sync-cursors.json');
}

module.exports = {
  getSecretsDir,
  ensureSecretsDir,
  itemsPath,
  accountMapPath,
  cursorsPath,
};
