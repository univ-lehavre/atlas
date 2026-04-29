#!/usr/bin/env node

/**
 * Audit dep-versions: detect packages declared with multiple different version
 * specifiers across the workspace, or pinned to an exact version (no range).
 * Also reports unstable versions (alpha, beta, rc, next, canary…).
 *
 * Errors   (exit 1): same package declared with >1 distinct specifier.
 * Warnings (exit 0): exact pin, or unstable/prerelease specifier.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['apps', 'cli', 'config', 'packages', 'sandbox', 'services'];
// peerDependencies intentionally use broader ranges in libraries — excluded from conflict check
const CONFLICT_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];
const PIN_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));

// conflict: { packageName -> Map<specifier, Set<workspace>> }
const conflictIndex = new Map();
// pins: { packageName -> Map<specifier, Set<workspace>> }
const pinIndex = new Map();

const addToIndex = (index, name, specifier, label) => {
  if (!index.has(name)) index.set(name, new Map());
  const specifiers = index.get(name);
  if (!specifiers.has(specifier)) specifiers.set(specifier, new Set());
  specifiers.get(specifier).add(label);
};

for (const root of ROOTS) {
  if (!existsSync(root)) continue;

  for (const entry of readdirSync(root)) {
    const dir = path.join(root, entry);
    if (!statSync(dir).isDirectory()) continue;

    const packageJsonPath = path.join(dir, 'package.json');
    if (!existsSync(packageJsonPath)) continue;

    const packageJson = readJson(packageJsonPath);
    const workspace = packageJson.name ?? dir;

    for (const field of PIN_FIELDS) {
      const deps = packageJson[field];
      if (!deps) continue;

      for (const [name, specifier] of Object.entries(deps)) {
        if (specifier.startsWith('workspace:')) continue;

        addToIndex(pinIndex, name, specifier, `${workspace} (${field})`);
        if (CONFLICT_FIELDS.includes(field)) {
          addToIndex(conflictIndex, name, specifier, workspace);
        }
      }
    }
  }
}

const PRERELEASE_RE = /[-+](alpha|beta|rc|next|canary|dev|pre|experimental|nightly)[\.\d]*/i;
const isPrerelease = (specifier) => PRERELEASE_RE.test(specifier) || /\d+\.\d+\.\d+-\w/.test(specifier);
const isExactPin = (specifier) => /^\d/.test(specifier);

const errors = [];
const warnings = [];
const unstable = [];

for (const [name, specifiers] of conflictIndex) {
  if (specifiers.size > 1) {
    const detail = [...specifiers.entries()]
      .map(([spec, workspaces]) => `"${spec}" (${[...workspaces].join(', ')})`)
      .join(' vs ');
    errors.push(`${name}: multiple specifiers — ${detail}`);
  }
}

for (const [name, specifiers] of pinIndex) {
  for (const [specifier, locations] of specifiers) {
    if (isExactPin(specifier)) {
      warnings.push(`${name}@${specifier}: exact pin in ${[...locations].join(', ')} — consider using a range (^)`);
    }
    if (isPrerelease(specifier)) {
      unstable.push(`${name}@${specifier}: prerelease in ${[...locations].join(', ')} — taze won't auto-update (use --pre manually)`);
    }
  }
}

if (unstable.length > 0) {
  console.warn('Dependency version audit — unstable/prerelease versions:\n');
  for (const u of unstable) {
    console.warn(`  ⚡  ${u}`);
  }
  console.warn('');
}

if (warnings.length > 0) {
  console.warn('Dependency version audit — warnings:\n');
  for (const w of warnings) {
    console.warn(`  ⚠  ${w}`);
  }
  console.warn('');
}

if (errors.length > 0) {
  console.error('Dependency version audit failed:\n');
  for (const e of errors) {
    console.error(`  ✖  ${e}`);
  }
  process.exit(1);
}

const issues = unstable.length + warnings.length;
console.log(issues === 0 ? 'Dependency version audit passed.' : 'Dependency version audit passed with warnings.');
