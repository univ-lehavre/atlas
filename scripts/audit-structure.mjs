#!/usr/bin/env node

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['apps', 'cli', 'config', 'packages', 'sandbox', 'services'];
const NO_CLI_SUFFIX_ALLOWED = new Set(['@univ-lehavre/atlas-redcap-openapi']);

const errors = [];

const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));

for (const root of ROOTS) {
  if (!existsSync(root)) continue;

  for (const entry of readdirSync(root)) {
    const dir = path.join(root, entry);
    if (!statSync(dir).isDirectory()) continue;

    const packageJsonPath = path.join(dir, 'package.json');
    if (!existsSync(packageJsonPath)) continue;

    const packageJson = readJson(packageJsonPath);
    const packageName = packageJson.name;

    if (typeof packageName !== 'string' || packageName.length === 0) {
      errors.push(`${dir}: missing package.json "name"`);
      continue;
    }

    if (root === 'apps') {
      if (packageJson.private !== true) {
        errors.push(`${dir}: apps must set "private": true`);
      }

      const appToken = entry.startsWith('atlas-') ? entry : `atlas-${entry}`;
      const expectedName = `@univ-lehavre/${appToken}`;
      if (packageName !== expectedName) {
        errors.push(`${dir}: expected name "${expectedName}", got "${packageName}"`);
      }
    }

    if (root === 'cli') {
      if (entry.endsWith('-cli')) {
        errors.push(`${dir}: directory name should not end with "-cli"`);
      }

      if (!packageName.endsWith('-cli') && !NO_CLI_SUFFIX_ALLOWED.has(packageName)) {
        errors.push(
          `${dir}: CLI package name should end with "-cli" (or be explicitly allowed)`
        );
      }
    }

    if (packageJson.repository && typeof packageJson.repository === 'object') {
      const expectedDirectory = dir.replaceAll(path.sep, '/');
      const actualDirectory = packageJson.repository.directory;
      if (actualDirectory !== expectedDirectory) {
        errors.push(
          `${dir}: repository.directory must be "${expectedDirectory}" (got "${actualDirectory ?? 'undefined'}")`
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Workspace structure audit failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Workspace structure audit passed.');
