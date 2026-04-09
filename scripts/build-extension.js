#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST_BROWSER = path.join(ROOT, 'dist', 'browser');
const DIST_EXT = path.join(ROOT, 'dist', 'chrome-extension');
const EXT_SRC = path.join(ROOT, 'chrome-extension');

// Validate icon files exist
const ICONS = ['icon-16.png', 'icon-48.png', 'icon-128.png'];
for (const icon of ICONS) {
  const p = path.join(EXT_SRC, 'icons', icon);
  if (!fs.existsSync(p)) {
    console.error(`Missing icon: ${p}`);
    process.exit(1);
  }
}

// Step 1: Angular production build
console.log('Building Angular app...');
try {
  execSync('npx ng build --configuration production', { cwd: ROOT, stdio: 'inherit' });
} catch {
  console.error('Angular build failed.');
  process.exit(1);
}

// Step 2: Assemble extension
console.log('Assembling Chrome extension...');

// Clean & create output dir
if (fs.existsSync(DIST_EXT)) fs.rmSync(DIST_EXT, { recursive: true });

// Copy Angular build output
copyDir(DIST_BROWSER, DIST_EXT);

// Copy manifest
fs.copyFileSync(path.join(EXT_SRC, 'manifest.json'), path.join(DIST_EXT, 'manifest.json'));

// Copy icons
const iconsOut = path.join(DIST_EXT, 'icons');
fs.mkdirSync(iconsOut, { recursive: true });
for (const icon of ICONS) {
  fs.copyFileSync(path.join(EXT_SRC, 'icons', icon), path.join(iconsOut, icon));
}

// Remove Angular service worker files (conflicts with extension)
for (const f of ['ngsw-worker.js', 'ngsw.json']) {
  const p = path.join(DIST_EXT, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// Patch <base href> to ./ for relative asset paths
const indexPath = path.join(DIST_EXT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<base href="[^"]*">/, '<base href="./">');

// CSP compliance: remove inline styles injected by Angular's critical CSS inlining
// Extract inline <style> content to a separate CSS file
const inlineStyleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (inlineStyleMatch) {
  const cssContent = inlineStyleMatch[1];
  fs.writeFileSync(path.join(DIST_EXT, 'critical.css'), cssContent);
  html = html.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="critical.css">');
}

// CSP compliance: remove onload inline event handlers from stylesheet links
// Replace <link ... onload="this.media='all'" media="print"> with <link ... media="all">
html = html.replace(/<link rel="stylesheet" href="([^"]+)" media="print" onload="[^"]*">/g,
  '<link rel="stylesheet" href="$1">');
// Remove the <noscript> fallback (not needed in extension context)
html = html.replace(/<noscript><link rel="stylesheet" href="[^"]*"><\/noscript>/g, '');

fs.writeFileSync(indexPath, html);

console.log(`Done → ${DIST_EXT}`);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
