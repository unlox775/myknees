/**
 * Knex config used by CLI (migrate, etc.).
 * Uses same logic as src/config.js so migrations run against the right DB.
 */

const path = require('path');

const endpoint = process.env.DATA_ENDPOINT;
const HOME = process.env.HOME || process.env.USERPROFILE || '';
const isMac = typeof HOME === 'string' && HOME.startsWith('/Users/');

const migrationsDir = path.join(__dirname, 'src', 'db', 'migrations');

if (endpoint && endpoint.startsWith('postgres')) {
  module.exports = {
    client: 'pg',
    connection: endpoint,
    pool: { min: 0, max: 5 },
    migrations: { directory: migrationsDir },
  };
} else {
  const sqlitePath = isMac
    ? path.join(HOME, '.myknees', 'backend', 'data', 'myknees.db')
    : path.join(__dirname, 'data', 'myknees.db');
  module.exports = {
    client: 'better-sqlite3',
    connection: { filename: sqlitePath },
    useNullAsDefault: true,
    migrations: { directory: migrationsDir },
  };
}
