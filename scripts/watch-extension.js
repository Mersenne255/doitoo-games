#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST_BROWSER = path.join(ROOT, 'dist', 'browser');
const DIST_EXT = path.join(ROOT, 'dist', 'chrome-extension');
const EXT_SRC = path.join(ROOT, 'chrome-extension');
const SRC_DIR = path.join(ROOT, 'src');

const ICONS = ['icon-16.png', 'icon-48.png', 'icon-128.png'];

let building = false;
let queued = false;
let debounceTimer = null;

function assembleExtension() {
  if (fs.existsSync(DIST_EXT)) fs.rmSync(DIST_EXT, { recursive: true });
  copyDir(DIST_BROWSER, DIST_EXT);
  fs.copyFileSync(path.join(EXT_SRC, 'manifest.json'), path.join(DIST_EXT, 'manifest.json'));
  const iconsOut = path.join(DIST_EXT, 'icons');
  fs.mkdirSync(iconsOut, { recursive: true });
  for (const icon of ICONS) {
    fs.copyFileSync(path.join(EXT_SRC, 'icons', icon), path.join(iconsOut, icon));
  }
  for (const f of ['ngsw-worker.js', 'ngsw.json']) {
    const p = path.join(DIST_EXT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  const indexPath = path.join(DIST_EXT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(/<base href="[^"]*">/, '<base href="./">');
  // CSP: extract inline styles to separate file
  const inlineStyleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (inlineStyleMatch) {
    fs.writeFileSync(path.join(DIST_EXT, 'critical.css'), inlineStyleMatch[1]);
    html = html.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="critical.css">');
  }
  // CSP: remove onload inline handlers
  html = html.replace(/<link rel="stylesheet" href="([^"]+)" media="print" onload="[^"]*">/g,
    '<link rel="stylesheet" href="$1">');
  html = html.replace(/<noscript><link rel="stylesheet" href="[^"]*"><\/noscript>/g, '');
  fs.writeFileSync(indexPath, html);
}

function rebuild() {
  if (building) { queued = true; return; }
  building = true;
  console.log(`\n[${new Date().toLocaleTimeString()}] Rebuilding...`);
  try {
    execSync('npx ng build --configuration production', { cwd: ROOT, stdio: 'inherit' });
    assembleExtension();
    console.log(`[${new Date().toLocaleTimeString()}] Extension ready → ${DIST_EXT}`);
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
