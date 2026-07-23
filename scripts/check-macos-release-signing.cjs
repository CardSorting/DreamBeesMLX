#!/usr/bin/env node

const { execFileSync } = require('node:child_process');

function hasEveryEnv(keys) {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

const errors = [];

if (process.platform !== 'darwin') {
  errors.push('macOS notarized release builds must run on macOS.');
}

const credentialOptions = [
  ['APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER'],
  ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'],
  ['APPLE_KEYCHAIN', 'APPLE_KEYCHAIN_PROFILE']
];

if (!credentialOptions.some(hasEveryEnv)) {
  errors.push(
    'Missing Apple notarization credentials. Set APPLE_API_KEY, APPLE_API_KEY_ID, and APPLE_API_ISSUER; or APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID; or APPLE_KEYCHAIN and APPLE_KEYCHAIN_PROFILE.'
  );
}

let identities = '';
try {
  identities = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
} catch (error) {
  errors.push(`Unable to inspect code-signing identities: ${error.message}`);
}

if (!identities.includes('Developer ID Application')) {
  errors.push('Missing a valid "Developer ID Application" signing identity in the active keychain.');
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[mac-release-preflight] ${error}`);
  }
  process.exit(1);
}

console.log('[mac-release-preflight] OK');
