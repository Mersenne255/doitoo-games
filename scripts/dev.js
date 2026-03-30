#!/usr/bin/env node

/**
 * scripts/dev.js — Starts the dev server for all games from registry.json.
 *
 * Reads games/registry.json, finds each game's package.json, and runs
 * `npm run watch` (or `npm start`) for each game concurrently alongside
 * the platform http-server.
 *
 * Single source of truth: games/registry.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const registryPath = path.join(ROOT, 'games', 'registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

const commands = [];
const names = [];
const colors = ['blue', 'green', 'magenta', 'cyan', 'yellow', 'red'];

// Platform server
commands.push('npx http-server . -p 8080 -c-1');
names.push('platform');

// Each game
for (const game of registry.games) {
  const gameDir = path.join(ROOT, 'games', game.id);
  const pkgPath = path.join(gameDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.warn(`⚠ No package.json for ${game.id} — skipping`);
    continue;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const scripts = pkg.scripts || {};

  // Prefer "watch" (build --watch), fall back to "start" (ng serve)
  if (scripts.watch) {
    commands.push(`cd games/${game.id} && npm run watch`);
    names.push(game.id.replace('doitoo-', ''));
  } else if (scripts.start) {
    commands.push(`cd games/${game.id} && npm start`);
    names.push(game.id.replace('doitoo-', ''));
  } else {
    console.warn(`⚠ ${game.id} has no watch or start script — skipping`);
  }
}

const nameStr = names.join(',');
const colorStr = colors.slice(0, names.length).join(',');
const cmdStr = commands.map(c => `"${c}"`).join(' ');

const fullCmd = `npx concurrently -k -n ${nameStr} -c ${colorStr} ${cmdStr}`;
console.log('Starting dev environment...');
console.log(`  Games: ${names.slice(1).join(', ')}\n`);

try {
  execSync(fullCmd, { cwd: ROOT, stdio: 'inherit' });
} catch {
  // concurrently exits non-zero when killed with -k
}
