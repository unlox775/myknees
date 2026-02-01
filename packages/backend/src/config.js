/**
 * Backend configuration: data store paths and DB connection.
 * On Mac, uses ~/.myknees; otherwise requires DATA_ENDPOINT (e.g. Postgres URL).
 */

const path = require('path');
const fs = require('fs');

const HOME = process.env.HOME || process.env.USERPROFILE || '';

/**
 * True if we appear to be on a Mac-style layout (/Users/...).
 */
function isMacLayout() {
  return typeof HOME === 'string' && HOME.startsWith('/Users/');
}

/**
 * Root data directory. On Mac: DATA_STORE_ROOT env or ~/.myknees/backend. Otherwise throws.
 * Set DATA_STORE_ROOT if you use a different path (e.g. ~/my-data/backend) so migrate, import, and sql all use the same DB.
 */
function getMykneesRoot() {
  if (!isMacLayout()) {
    throw new Error(
      'Local data store is only supported on Mac (/Users/...). ' +
        'Set DATA_ENDPOINT (e.g. postgresql://...) for other platforms.'
    );
  }
  if (process.env.DATA_STORE_ROOT) {
    return path.resolve(HOME, process.env.DATA_STORE_ROOT.replace(/^~(?=\/|$)/, HOME));
  }
  return path.join(HOME, '.myknees', 'backend');
}

/**
 * Ensure ~/.myknees and subdirs exist. Throws if not Mac.
 */
function ensureMykneesDirs() {
  const root = getMykneesRoot();
  const dirs = [
    root,
    path.join(root, 'imports'),
    path.join(root, 'imports', 'ignore'),
    path.join(root, 'data'),
    path.join(root, 'backups'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  return root;
}

/**
 * Get path to SQLite database file (only when using local SQLite).
 */
function getSqlitePath() {
  const root = getMykneesRoot();
  return path.join(root, 'data', 'myknees.db');
}

/**
 * Database config for knex.
 * - If DATA_ENDPOINT is set (e.g. postgresql://...), use PostgreSQL.
 * - Otherwise use SQLite at ~/.myknees/data/myknees.db (Mac only).
 */
function getKnexConfig() {
  const endpoint = process.env.DATA_ENDPOINT;
  if (endpoint && endpoint.startsWith('postgres')) {
    return {
      client: 'pg',
      connection: endpoint,
      pool: { min: 0, max: 5 },
      migrations: { directory: path.join(__dirname, 'db', 'migrations') },
    };
  }
  ensureMykneesDirs();
  return {
    client: 'better-sqlite3',
    connection: { filename: getSqlitePath() },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, 'db', 'migrations') },
  };
}

module.exports = {
  isMacLayout,
  getMykneesRoot,
  ensureMykneesDirs,
  getSqlitePath,
  getKnexConfig,
};
