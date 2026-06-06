#!/usr/bin/env node
// patch-expo-cli-tar.cjs
//
// Root cause: tar@7 removed the .extract() export (renamed to .x()).
// @expo/cli@0.22.x still calls tar.extract() during expo prebuild when
// extracting the iOS template tarball, producing:
//   "Cannot read properties of undefined (reading 'extract')"
//
// Fix: patch tar's CJS runtime file to re-export .extract as an alias
// of .x immediately after npm ci installs tar@7.

'use strict';
const fs   = require('fs');
const path = require('path');

// Script lives at <repo>/scripts/; repo root is one level up.
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
  console.log('[patch-tar] tar <7 exports .extract natively – nothing to do');
  process.exit(0);
}

// Find the CJS runtime .js file.
// IMPORTANT: tar v7 exports map puts the .d.ts entry BEFORE the .js entry,
// so we must NOT rely on order-of-values in the exports object.
// Instead, check known paths directly first.
function findCjsJs(dir) {
  const knownPaths = [
    'dist/commonjs/index.js',
    'dist/cjs/index.js',
    'lib/index.js',
    'index.js',
  ];
  for (const p of knownPaths) {
    const full = path.join(dir, p);
    if (fs.existsSync(full)) return full;
  }
  // Fallback: walk the exports map, accepting only .js files
  try {
    const exp = tarPkg.exports;
    const root = (exp && exp['.']) || exp;
    if (!root) return null;
    const sections = [root.require, root.default, root];
    for (const sec of sections) {
      if (!sec) continue;
      const vals = typeof sec === 'string' ? [sec] : Object.values(sec);
      for (const v of vals) {
        if (typeof v === 'string' && v.endsWith('.js')) {
          const full = path.join(dir, v);
          if (fs.existsSync(full)) return full;
        }
      }
    }
  } catch (_) {}
  return null;
}

const cjsEntry = findCjsJs(tarDir);
if (!cjsEntry) {
  console.log('[patch-tar] Could not locate tar CJS .js entry – skipping');
  process.exit(0);
}

console.log('[patch-tar] Target:', path.relative(mobileModules, cjsEntry));

let src = fs.readFileSync(cjsEntry, 'utf8');
if (src.includes('exports.extract')) {
  console.log('[patch-tar] .extract already present – nothing to do');
  process.exit(0);
}

// Append the compat alias and write back.
src += '\n// patch-expo-cli-tar: .extract alias for @expo/cli compat (tar v7)\n';
src += 'if (typeof exports.x === "function" && !exports.extract) {\n';
src += '  exports.extract = exports.x;\n';
src += '}\n';

fs.writeFileSync(cjsEntry, src);
console.log('[patch-tar] Patched – exports.extract = exports.x added ✓');
