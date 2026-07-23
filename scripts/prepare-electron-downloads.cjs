#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const projectRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release');
const downloadsDir = process.env.DOWNLOADS_DIR
  ? path.resolve(projectRoot, process.env.DOWNLOADS_DIR)
  : path.join(projectRoot, 'dist', 'downloads');
const pkgPath = path.join(projectRoot, 'package.json');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return false;
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function pickLatestFile(filePaths) {
  if (filePaths.length === 0) return null;
  const sorted = [...filePaths].sort((a, b) => {
    const aTime = fs.statSync(a).mtimeMs;
    const bTime = fs.statSync(b).mtimeMs;
    return bTime - aTime;
  });
  return sorted[0];
}

function fileMetadata(filePath) {
  return {
    sizeBytes: fs.statSync(filePath).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
  };
}

function main() {
  if (!fs.existsSync(releaseDir)) {
    throw new Error('Missing release directory. Run electron-builder first.');
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version || '0.0.0';

  ensureDir(downloadsDir);

  const releaseEntries = fs.readdirSync(releaseDir);
  const releaseFiles = releaseEntries.map((entry) => path.join(releaseDir, entry));

  const macInstaller = pickLatestFile(
    releaseFiles.filter((filePath) => filePath.toLowerCase().endsWith('.dmg'))
  );
  const windowsInstaller = pickLatestFile(
    releaseFiles.filter((filePath) => filePath.toLowerCase().endsWith('.exe'))
  );
  const linuxInstaller = pickLatestFile(
    releaseFiles.filter((filePath) => filePath.toLowerCase().endsWith('.appimage'))
  );

  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    files: {}
  };

  if (macInstaller) {
    const stableName = 'dreambees-lite-mac.dmg';
    const versionedName = `dreambees-lite-${version}-mac.dmg`;
    copyIfExists(macInstaller, path.join(downloadsDir, stableName));
    copyIfExists(macInstaller, path.join(downloadsDir, versionedName));
    const metadata = fileMetadata(macInstaller);
    manifest.files.mac = {
      stable: `/downloads/${stableName}`,
      versioned: `/downloads/${versionedName}`,
      sourceFile: path.basename(macInstaller),
      ...metadata
    };
  }

  if (windowsInstaller) {
    const stableName = 'dreambees-lite-windows.exe';
    const versionedName = `dreambees-lite-${version}-windows.exe`;
    copyIfExists(windowsInstaller, path.join(downloadsDir, stableName));
    copyIfExists(windowsInstaller, path.join(downloadsDir, versionedName));
    const metadata = fileMetadata(windowsInstaller);
    manifest.files.windows = {
      stable: `/downloads/${stableName}`,
      versioned: `/downloads/${versionedName}`,
      sourceFile: path.basename(windowsInstaller),
      ...metadata
    };
  }

  if (linuxInstaller) {
    const stableName = 'dreambees-lite-linux.AppImage';
    const versionedName = `dreambees-lite-${version}-linux.AppImage`;
    copyIfExists(linuxInstaller, path.join(downloadsDir, stableName));
    copyIfExists(linuxInstaller, path.join(downloadsDir, versionedName));
    const metadata = fileMetadata(linuxInstaller);
    manifest.files.linux = {
      stable: `/downloads/${stableName}`,
      versioned: `/downloads/${versionedName}`,
      sourceFile: path.basename(linuxInstaller),
      ...metadata
    };
  }

  fs.writeFileSync(
    path.join(downloadsDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  console.log('[prepare-electron-downloads] Created dist/downloads artifacts:');
  console.log(JSON.stringify(manifest, null, 2));
}

main();
