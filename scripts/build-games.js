#!/usr/bin/env node

/**
 * scripts/build-games.js — Builds all games from registry.json.
 * Single source of truth: games/registry.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const registry = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'games', 'registry.json'), 'utf-8')
);

for (const game of registry.games) {
  const gameDir = path.join(ROOT, 'games', game.id);
  const pkgPath = path.join(gameDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.warn(`⚠ No package.json for ${game.id} — skipping`);
    continue;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  if (!pkg.scripts?.build) {
    console.warn(`⚠ ${game.id} has no build script — skipping`);
    continue;
  }

  console.log(`\n🔨 Building ${game.id}...`);
  execSync('npm run build', { cwd: gameDir, stdio: 'inherit' });
  console.log(`✓ ${game.id} built`);
}

console.log('\n✅ All games built');
