const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mainPath = path.join(root, 'dist-electron', 'main.js');
const nativePath = path.join(root, 'release', 'mac-arm64', 'DreamBees Lite.app', 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
const distIndex = path.join(root, 'dist', 'index.html');
const distManifest = path.join(root, 'dist', 'manifest.json');

function assert(condition, message) {
  if (!condition) {
    console.error(`[verify-electron-build] FAIL: ${message}`);
    process.exit(1);
  }
}

assert(fs.existsSync(mainPath), 'dist-electron/main.js is missing');
const main = fs.readFileSync(mainPath, 'utf8');
assert(main.includes('better-sqlite3'), 'better-sqlite3 is not referenced by Electron main bundle');
assert(!main.includes('Could not dynamically require'), 'better-sqlite3 dynamic loader was bundled into Electron main');
assert(fs.existsSync(nativePath), `native sqlite binding missing: ${nativePath}`);
assert(fs.existsSync(distIndex), 'dist/index.html is missing');
assert(fs.existsSync(distManifest), 'dist/manifest.json is missing');
console.log('[verify-electron-build] OK');
