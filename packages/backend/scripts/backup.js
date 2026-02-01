#!/usr/bin/env node
/**
 * Backs up ~/.myknees/imports and ~/.myknees/data into ~/.myknees/backups.
 * Rotation: keep last 7 daily; then 4 weekly; then one per month forever (no purge of monthly).
 * Schedule: run daily (e.g. cron 0 0 * * *).
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const isMac = typeof HOME === 'string' && HOME.startsWith('/Users/');

const MYKNEES_ROOT = path.join(HOME, '.myknees', 'backend');
const BACKUPS_DIR = path.join(MYKNEES_ROOT, 'backups');
const IMPORTS_DIR = path.join(MYKNEES_ROOT, 'imports');
const DATA_DIR = path.join(MYKNEES_ROOT, 'data');

const DAILY_TO_KEEP = 7;
const WEEKLY_TO_KEEP = 4;
/** Monthly backups are kept forever (one per calendar month). */

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

  const cwd = MYKNEES_ROOT;
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
  if (backups.length === 0) return;
  const keepSet = new Set();

  // 1. Daily: keep newest N
  const daily = backups.slice(0, DAILY_TO_KEEP);
  daily.forEach((b) => keepSet.add(b.name));

  // 2. Weekly: from the rest, one per week for the last WEEKLY_TO_KEEP weeks
  const restAfterDaily = backups.slice(DAILY_TO_KEEP);
  const byWeek = new Map();
  for (const b of restAfterDaily) {
    const weekKey = getWeekKey(b.mtime);
    if (!byWeek.has(weekKey)) byWeek.set(weekKey, []);
    byWeek.get(weekKey).push(b);
  }
  const weeklySnapshots = [];
  for (const [, arr] of byWeek) {
    arr.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    weeklySnapshots.push(arr[0]);
  }
  weeklySnapshots.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  const keepWeekly = weeklySnapshots.slice(0, WEEKLY_TO_KEEP);
  keepWeekly.forEach((b) => keepSet.add(b.name));

  // 3. Monthly: from everything not kept so far, keep one per calendar month forever
  const restAfterWeekly = backups.filter((b) => !keepSet.has(b.name));
  const byMonth = new Map();
  for (const b of restAfterWeekly) {
    const monthKey = getMonthKey(b.mtime);
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
    byMonth.get(monthKey).push(b);
  }
  for (const [, arr] of byMonth) {
    arr.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    keepSet.add(arr[0].name);
  }

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

function getMonthKey(date) {
  const d = new Date(date);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
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
  if (!fs.existsSync(MYKNEES_ROOT)) {
    console.error('Data store not found at', MYKNEES_ROOT, '- run "make data-store" first.');
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
