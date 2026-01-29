/**
 * TypeScript code analyzer for extracting statistics.
 * @module
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { type CodeStats, type TestStats, emptyCodeStats, emptyTestStats } from './types.js';

/**
 * Regex patterns for analyzing TypeScript code.
 */
export const PATTERNS = {
  /** Matches exported constants: export const NAME = or export const NAME: */
  exportedConstant: /export\s+const\s+\w+\s*[=:]/g,

  /** Matches exported functions: export const fn = () => or export function fn or export async function fn */
  exportedFunction:
    /export\s+(?:const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>|(?:async\s+)?function\s+\w+)/g,

  /** Matches exported types */
  exportedType: /export\s+type\s+\w+/g,

  /** Matches exported interfaces */
  exportedInterface: /export\s+interface\s+\w+/g,

  /** Matches TSDoc comments */
  tsdocComment: /\/\*\*[\s\S]*?\*\//g,

  /** Matches describe blocks in tests */
  describeBlock: /describe\s*\(\s*['"`]/g,

  /** Matches test/it blocks in tests */
  testBlock: /(?:it|test)\s*\(\s*['"`]/g,
} as const;

/**
 * Checks if a file is a TypeScript source file (not test).
 */
export const isTypeScriptSourceFile = (filePath: string): boolean => {
  return (
    (filePath.endsWith('.ts') || filePath.endsWith('.svelte')) &&
    !filePath.endsWith('.test.ts') &&
    !filePath.endsWith('.spec.ts') &&
    !filePath.endsWith('.d.ts')
  );
};

/**
 * Checks if a file is a TypeScript test file.
 */
export const isTestFile = (filePath: string): boolean => {
  return filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts');
};

/**
 * Counts regex matches in content.
 */
export const countMatches = (content: string, pattern: RegExp): number => {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
};

/**
 * Analyzes TypeScript source file content for code statistics.
 */
export const analyzeTypeScriptContent = (content: string): Omit<CodeStats, 'files'> => {
  const constants = countMatches(content, PATTERNS.exportedConstant);
  const functions = countMatches(content, PATTERNS.exportedFunction);
  const types = countMatches(content, PATTERNS.exportedType);
  const interfaces = countMatches(content, PATTERNS.exportedInterface);
  const tsdocComments = countMatches(content, PATTERNS.tsdocComment);

  return {
    constants,
    functions,
    types,
    interfaces,
    tsdocComments,
  };
};

/**
 * Analyzes test file content for test statistics.
 */
export const analyzeTestContent = (content: string): Omit<TestStats, 'files'> => {
  const describes = countMatches(content, PATTERNS.describeBlock);
  const tests = countMatches(content, PATTERNS.testBlock);

  return {
    describes,
    tests,
  };
};

/**
 * Directories to exclude from analysis.
 */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svelte-kit',
  'dist',
  'build',
  '.turbo',
  'coverage',
  'upstream',
]);

/**
 * Recursively gets all files in a directory.
 */
const getAllFiles = async (dirPath: string, basePath: string = dirPath): Promise<string[]> => {
  const files: string[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) {
          continue;
        }
        const subFiles = await getAllFiles(fullPath, basePath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(relative(basePath, fullPath));
      }
    }
  } catch {
    // Directory doesn't exist or not accessible
  }

  return files;
};

/**
 * Analyzes all TypeScript files in a directory.
 */
export const analyzeDirectory = async (
  repoPath: string
): Promise<{ code: CodeStats; tests: TestStats }> => {
  const code = emptyCodeStats();
  const tests = emptyTestStats();

  const allFiles = await getAllFiles(repoPath);

  for (const filePath of allFiles) {
    const fullPath = join(repoPath, filePath);

    try {
      if (isTypeScriptSourceFile(filePath)) {
        const content = await readFile(fullPath, 'utf-8');
        const stats = analyzeTypeScriptContent(content);
        code.files++;
        code.constants += stats.constants;
        code.functions += stats.functions;
        code.types += stats.types;
        code.interfaces += stats.interfaces;
        code.tsdocComments += stats.tsdocComments;
      } else if (isTestFile(filePath)) {
        const content = await readFile(fullPath, 'utf-8');
        const stats = analyzeTestContent(content);
        tests.files++;
        tests.describes += stats.describes;
        tests.tests += stats.tests;
      }
    } catch {
      // File read error, skip
    }
  }

  return { code, tests };
};

/**
 * Adds two code statistics together.
 */
export const addCodeStats = (a: CodeStats, b: CodeStats): CodeStats => ({
  files: a.files + b.files,
  constants: a.constants + b.constants,
  functions: a.functions + b.functions,
  types: a.types + b.types,
  interfaces: a.interfaces + b.interfaces,
  tsdocComments: a.tsdocComments + b.tsdocComments,
});

/**
 * Adds two test statistics together.
 */
export const addTestStats = (a: TestStats, b: TestStats): TestStats => ({
  files: a.files + b.files,
  describes: a.describes + b.describes,
  tests: a.tests + b.tests,
});
