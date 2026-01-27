import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { type TCodeStats, type TTestStats, emptyCodeStats, emptyTestStats } from './types';

/**
 * Regex patterns for analyzing TypeScript code.
 */
export const PATTERNS = {
  /** Matches exported constants: export const NAME = or export const NAME: */
  exportedConstant: /export\s+const\s+\w+\s*[=:]/g,

  /** Matches exported functions: export const fn = () => or export function fn */
  exportedFunction:
    /export\s+(?:const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>|function\s+\w+)/g,

  /** Matches exported types and interfaces */
  exportedType: /export\s+(?:type|interface)\s+\w+/g,

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
    filePath.endsWith('.ts') &&
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
 * @param content - File content to analyze
 * @returns Code statistics (constants, functions, types)
 */
export const analyzeTypeScriptContent = (content: string): Omit<TCodeStats, 'files'> => {
  const constants = countMatches(content, PATTERNS.exportedConstant);
  const functions = countMatches(content, PATTERNS.exportedFunction);
  const types = countMatches(content, PATTERNS.exportedType);

  return {
    constants,
    functions,
    types,
  };
};

/**
 * Analyzes test file content for test statistics.
 * @param content - File content to analyze
 * @returns Test statistics (describes, tests)
 */
export const analyzeTestContent = (content: string): Omit<TTestStats, 'files'> => {
  const describes = countMatches(content, PATTERNS.describeBlock);
  const tests = countMatches(content, PATTERNS.testBlock);

  return {
    describes,
    tests,
  };
};

/**
 * Recursively gets all files in a directory.
 */
const getAllFiles = async (dirPath: string, basePath: string = dirPath): Promise<string[]> => {
  const files: string[] = [];
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.svelte-kit') {
        continue;
      }
      const subFiles = await getAllFiles(fullPath, basePath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(relative(basePath, fullPath));
    }
  }

  return files;
};

/**
 * Analyzes all TypeScript files in a directory.
 * @param repoPath - Path to the repository root
 * @returns Current code and test statistics
 */
export const analyzeDirectory = async (
  repoPath: string
): Promise<{ code: TCodeStats; tests: TTestStats }> => {
  const code = emptyCodeStats();
  const tests = emptyTestStats();

  const allFiles = await getAllFiles(repoPath);

  for (const filePath of allFiles) {
    const fullPath = join(repoPath, filePath);

    if (isTypeScriptSourceFile(filePath)) {
      const content = await readFile(fullPath, 'utf-8');
      const stats = analyzeTypeScriptContent(content);
      code.files++;
      code.constants += stats.constants;
      code.functions += stats.functions;
      code.types += stats.types;
    } else if (isTestFile(filePath)) {
      const content = await readFile(fullPath, 'utf-8');
      const stats = analyzeTestContent(content);
      tests.files++;
      tests.describes += stats.describes;
      tests.tests += stats.tests;
    }
  }

  return { code, tests };
};

/**
 * Analyzes a single file's content based on its type.
 * @param filePath - Path to identify file type
 * @param content - File content
 * @returns Object with code or test stats depending on file type
 */
export const analyzeFileContent = (
  filePath: string,
  content: string
): {
  type: 'source' | 'test' | 'other';
  codeStats?: Omit<TCodeStats, 'files'>;
  testStats?: Omit<TTestStats, 'files'>;
} => {
  if (isTypeScriptSourceFile(filePath)) {
    return {
      type: 'source',
      codeStats: analyzeTypeScriptContent(content),
    };
  }

  if (isTestFile(filePath)) {
    return {
      type: 'test',
      testStats: analyzeTestContent(content),
    };
  }

  return { type: 'other' };
};
