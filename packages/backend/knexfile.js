/**
 * Knex config for CLI (migrate, etc.).
 * Uses config.js so migrate uses the exact same DB as add-account, import, and sql-console.
 */

const path = require('path');
const { getKnexConfig } = require('./src/config');

const config = getKnexConfig();
config.migrations = config.migrations || { directory: path.join(__dirname, 'src', 'db', 'migrations') };
module.exports = config;
