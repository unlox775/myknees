/**
 * Knex instance for SQLite or PostgreSQL.
 * Uses config from src/config.js.
 */

const knex = require('knex');
const { getKnexConfig } = require('../config');

let _knex = null;

function getKnex() {
  if (!_knex) {
    _knex = knex(getKnexConfig());
  }
  return _knex;
}

function destroyKnex() {
  if (_knex) {
    return _knex.destroy().then(() => {
      _knex = null;
    });
  }
  return Promise.resolve();
}

module.exports = { getKnex, destroyKnex };
