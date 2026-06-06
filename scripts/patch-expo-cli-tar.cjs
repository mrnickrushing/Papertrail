#!/usr/bin/env node
// patch-expo-cli-tar.cjs
//
// Root cause: tar@7 removed the .extract() export (renamed to .x()).
// @expo/cli@0.22.x still calls tar.extract() during expo prebuild when
// extracting the iOS/Android template tarball.
//
// Fix: after npm ci installs tar@7, patch its CJS entry point to
// re-export .extract as an alias of .x so @expo/cli finds it.

'use strict';
const fs   = require('fs');
const path = require('path');

// This script lives at <repo>/scripts/ and is run from the repo root.
const mobileModules = path.join(__dirname, '..', 'mobile', 'node_modules');
const tarDir = path.join(mobileModules, 'tar');

if (!fs.existsSync(tarDir)) {
  console.log('[patch-tar] tar not found in mobile/node_modules – skipping');
  process.exit(0);
}

const tarPkg = JSON.parse(fs.readFileSync(path.join(tarDir, 'package.json'), 'utf8'));
const major = parseInt(tarPkg.version.split('.')[0], 10);
console.log('[patch-tar] tar version:', tarPkg.version);

if (major < 7) {
  console.log('[patch-tar] tar <7 has .extract natively – nothing to patch');
  process.exit(0);
}

// Locate the CJS entry point from the exports map.
function resolveCjsEntry(dir, pkg) {
  const exp = pkg.exports;
  if (exp) {
    // Handles both { '.': { require: '...' } } and { require: '...' }
    const root = exp['.'] || exp;
    const candidates = [
      root && root.require,
      root && root.default,
      root && root['import'],   // fallback
      typeof root === 'string' ? root : null,
    ];
    for (const c of candidates) {
      if (typeof c === 'string') {
        const full = path.join(dir, c);
        if (fs.existsSync(full)) return full;
      } else if (c && typeof c === 'object') {
        for (const v of Object.values(c)) {
          if (typeof v === 'string') {
            const full = path.join(dir, v);
            if (fs.existsSync(full)) return full;
          }
        }
      }
    }
  }
  // Fallback: common tar v7 layout
  const fallbacks = [
    'dist/commonjs/index.js',
    'dist/cjs/index.js',
    'lib/index.js',
    'index.js',
  ];
  for (const f of fallbacks) {
    const full = path.join(dir, f);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

const cjsEntry = resolveCjsEntry(tarDir, tarPkg);
if (!cjsEntry) {
  console.log('[patch-tar] Could not locate tar CJS entry – patch skipped');
  process.exit(0);
}

console.log('[patch-tar] Patching:', path.relative(mobileModules, cjsEntry));

let src = fs.readFileSync(cjsEntry, 'utf8');
if (src.includes('exports.extract')) {
  console.log('[patch-tar] .extract already exported – nothing to do');
  process.exit(0);
}

// Append compat alias
src += [
  '',
  '// patch-expo-cli-tar: re-export .extract as alias of .x for @expo/cli compat',
  'if (typeof exports.x === "function" && !exports.extract) {',
  '  exports.extract = exports.x;',
  '}',
  '',
].join('\n');

fs.writeFileSync(cjsEntry, src);
console.log('[patch-tar] Done – exports.extract = exports.x added ✓');
