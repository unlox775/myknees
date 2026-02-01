#!/usr/bin/env node
/**
 * Backs up ~/.myknees/imports and ~/.myknees/data into ~/.myknees/backups.
 * Rotation: keep last 7 daily backups; then keep 4 weekly; delete older.
 * Schedule: run daily (e.g. cron 0 0 * * *).
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const isMac = typeof HOME === 'string' && HOME.startsWith('/Users/');

const MINES_ROOT = path.join(HOME, '.myknees', 'backend');
const BACKUPS_DIR = path.join(MINES_ROOT, 'backups');
const IMPORTS_DIR = path.join(MINES_ROOT, 'imports');
const DATA_DIR = path.join(MINES_ROOT, 'data');

const DAILY_TO_KEEP = 7;
const WEEKLY_TO_KEEP = 4;

function run(cmd, opts = {}) {
  execSync(cmd, { encoding: 'utf8', ...opts });
}

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function timestamp() {
  const d = new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') +
    '-' +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') +
    String(d.getSeconds()).padStart(2, '0')
  );
}

function createArchive() {
  const ts = timestamp();
  const name = `backup-${ts}.tar.gz`;
  const archivePath = path.join(BACKUPS_DIR, name);

  const cwd = MINES_ROOT;
  const files = ['imports', 'data'].filter((f) => fs.existsSync(path.join(cwd, f)));
  if (files.length === 0) {
    console.log('Nothing to back up (imports/data missing).');
    return null;
  }
  const tarList = files.join(' ');
  run(`tar -czf "${archivePath}" -C "${cwd}" ${tarList}`);
  console.log('Created:', name);
  return name;
}

function listBackupFiles() {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.tar.gz'))
    .map((f) => ({
      name: f,
      path: path.join(BACKUPS_DIR, f),
      mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

function rotate(backups) {
  if (backups.length <= DAILY_TO_KEEP + WEEKLY_TO_KEEP) return;
  const daily = backups.slice(0, DAILY_TO_KEEP);
  const rest = backups.slice(DAILY_TO_KEEP);
  const byWeek = new Map();
  for (const b of rest) {
    const weekKey = getWeekKey(b.mtime);
    if (!byWeek.has(weekKey)) byWeek.set(weekKey, []);
    byWeek.get(weekKey).push(b);
  }
  const weekly = [];
  for (const [, arr] of byWeek) {
    arr.sort((a, b) => b.mtime - a.mtime);
    weekly.push(arr[0]);
  }
  weekly.sort((a, b) => b.mtime - a.mtime);
  const keepWeekly = weekly.slice(0, WEEKLY_TO_KEEP);
  const keepSet = new Set([...daily.map((b) => b.name), ...keepWeekly.map((b) => b.name)]);
  const toDelete = backups.filter((b) => !keepSet.has(b.name));
  for (const b of toDelete) {
    try {
      fs.unlinkSync(b.path);
      console.log('Removed old backup:', b.name);
    } catch (e) {
      console.error('Failed to remove', b.name, e.message);
    }
  }
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function main() {
  if (!isMac) {
    console.error('Backups are only supported for local ~/.myknees (Mac).');
    process.exit(1);
  }
  if (!fs.existsSync(MINES_ROOT)) {
    console.error('Data store not found at', MINES_ROOT, '- run "make data-store" first.');
    process.exit(1);
  }

  ensureBackupsDir();
  const name = createArchive();
  if (name) {
    const backups = listBackupFiles();
    rotate(backups);
  }
}

main();
