#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const EXT_SRC = path.join(ROOT, 'chrome-extension');

let building = false;
let queued = false;
let debounceTimer = null;

function rebuild() {
  if (building) { queued = true; return; }
  building = true;
  console.log(`\n[${new Date().toLocaleTimeString()}] Rebuilding...`);
  try {
    execSync('node scripts/build-extension.js', { cwd: ROOT, stdio: 'inherit' });
    console.log(`[${new Date().toLocaleTimeString()}] Extension ready.`);
  } catch {
    console.error('Build failed.');
  }
  building = false;
  if (queued) { queued = false; rebuild(); }
}

// Initial build
rebuild();

// Watch src/ and chrome-extension/ for changes
console.log('Watching for changes...');
for (const dir of [SRC_DIR, EXT_SRC]) {
  fs.watch(dir, { recursive: true }, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuild, 500);
  });
}
