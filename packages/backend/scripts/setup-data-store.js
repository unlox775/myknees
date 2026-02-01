#!/usr/bin/env node
/**
 * Creates ~/.myknees (imports, data, backups) and optional symlinks in the repo.
 * Mac only (/Users/...). On other platforms, exits with instructions to set DATA_ENDPOINT.
 */

const path = require('path');
const fs = require('fs');

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const isMac = typeof HOME === 'string' && HOME.startsWith('/Users/');

function main() {
  if (!isMac) {
    console.error(
      'Local data store is only supported on Mac (/Users/...).\n' +
        'On other platforms, set DATA_ENDPOINT (e.g. postgresql://user:pass@host/db) and run migrations.'
    );
    process.exit(1);
  }

  const minesRoot = path.join(HOME, '.myknees', 'backend');
  const dirs = [
    minesRoot,
    path.join(minesRoot, 'imports'),
    path.join(minesRoot, 'imports', 'ignore'),
    path.join(minesRoot, 'data'),
    path.join(minesRoot, 'backups'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('Created:', dir);
    } else {
      console.log('Exists:', dir);
    }
  }

  // Symlinks from repo (packages/backend/) to ~/.myknees
  const backendRoot = path.resolve(__dirname, '..');
  const links = [
    { from: path.join(backendRoot, 'imports'), to: path.join(minesRoot, 'imports') },
    { from: path.join(backendRoot, 'data'), to: path.join(minesRoot, 'data') },
    { from: path.join(backendRoot, 'backups'), to: path.join(minesRoot, 'backups') },
  ];

  for (const { from, to } of links) {
    if (fs.existsSync(from)) {
      const stat = fs.lstatSync(from);
      if (stat.isSymbolicLink()) {
        const current = fs.readlinkSync(from);
        if (path.resolve(current) === path.resolve(to)) {
          console.log('Symlink OK:', from, '->', to);
          continue;
        }
      }
      console.log('Path exists (not overwriting):', from);
      continue;
    }
    try {
      fs.symlinkSync(to, from);
      console.log('Symlink created:', from, '->', to);
    } catch (e) {
      console.error('Failed to create symlink', from, e.message);
    }
  }

  console.log('\nData store ready at', minesRoot);
  console.log('Run "npm run migrate" (or "make migrate" from backend) to create tables.');
}

main();
