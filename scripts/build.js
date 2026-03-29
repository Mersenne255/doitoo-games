#!/usr/bin/env node

/**
 * scripts/build.js — Assembles the final dist/ folder for the Doitoo Games platform.
 *
 * Copies:
 *   - Platform files: index.html, platform.js, platform.css
 *   - shared/ utilities
 *   - games/registry.json
 *   - Each game's dist/ output into dist/games/<game-id>/dist/
 *
 * Run: npm run build (builds all games first, then assembles)
 *   or: npm run build:platform (assemble only, assumes games are already built)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// ── Helpers ──

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileSync(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// ── Build ──

console.log('🔨 Assembling platform dist...');
cleanDir(DIST);

// 1. Platform root files
for (const file of ['index.html', 'platform.js', 'platform.css']) {
  const src = path.join(ROOT, file);
  if (fs.existsSync(src)) {
    copyFileSync(src, path.join(DIST, file));
    console.log(`  ✓ ${file}`);
  }
}

// 2. Shared utilities
const sharedSrc = path.join(ROOT, 'shared');
if (fs.existsSync(sharedSrc)) {
  copyDirSync(sharedSrc, path.join(DIST, 'shared'));
  console.log('  ✓ shared/');
}

// 3. Game registry
const registrySrc = path.join(ROOT, 'games', 'registry.json');
if (fs.existsSync(registrySrc)) {
  copyFileSync(registrySrc, path.join(DIST, 'games', 'registry.json'));
  console.log('  ✓ games/registry.json');
}

// 4. Each game's built output
const registry = JSON.parse(fs.readFileSync(registrySrc, 'utf-8'));
for (const game of registry.games) {
  const gameDistSrc = path.join(ROOT, 'games', game.id, 'dist');
  const gameDistDest = path.join(DIST, 'games', game.id, 'dist');
  if (fs.existsSync(gameDistSrc)) {
    copyDirSync(gameDistSrc, gameDistDest);
    console.log(`  ✓ games/${game.id}/dist/`);
  } else {
    console.warn(`  ⚠ games/${game.id}/dist/ not found — skipping (run build:games first)`);
  }
}

console.log(`\n✅ Platform assembled in dist/`);
