const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const gitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
})();

const buildTime = new Date().toISOString();
const version = pkg.version;

const content = `// Auto-generated — do not edit
export const BUILD_INFO = {
  version: '${version}',
  buildTime: '${buildTime}',
  gitHash: '${gitHash}',
} as const;
`;

const dir = path.join(__dirname, '..', 'src', 'environments');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'build-info.ts'), content);
console.log('Build info generated:', { version, buildTime, gitHash });
