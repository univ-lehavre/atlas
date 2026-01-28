/**
 * VitePress data loader for repository statistics.
 *
 * This loader reads the generated repo-stats.json file and exposes it
 * to Vue components through VitePress's data loading system.
 *
 * @module
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Code statistics for TypeScript source files.
 */
export interface CodeStats {
  files: number;
  functions: number;
  types: number;
  interfaces: number;
  constants: number;
}

/**
 * Test statistics for test files.
 */
export interface TestStats {
  files: number;
  describes: number;
  tests: number;
}

/**
 * Timeline entry for daily or monthly aggregation.
 */
export interface TimelineEntry {
  period: string;
  commits: number;
  additions: number;
  deletions: number;
  filesChanged: number;
}

/**
 * Statistics for a single package.
 */
export interface PackageStats {
  name: string;
  path: string;
  code: CodeStats;
  tests: TestStats;
  latestCommit: string | null;
  commitCount: number;
  linesAdded: number;
  linesDeleted: number;
}

/**
 * Complete repository statistics.
 */
export interface RepoStats {
  generatedAt: string;
  repository: {
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
    firstCommit: string | null;
    lastCommit: string | null;
  };
  packages: PackageStats[];
  timeline: {
    daily: TimelineEntry[];
    monthly: TimelineEntry[];
  };
  current: {
    code: CodeStats;
    tests: TestStats;
  };
}

/**
 * Default empty statistics for when the file doesn't exist.
 */
const emptyStats: RepoStats = {
  generatedAt: new Date().toISOString(),
  repository: {
    totalCommits: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    firstCommit: null,
    lastCommit: null,
  },
  packages: [],
  timeline: {
    daily: [],
    monthly: [],
  },
  current: {
    code: { files: 0, functions: 0, types: 0, interfaces: 0, constants: 0 },
    tests: { files: 0, describes: 0, tests: 0 },
  },
};

declare const data: RepoStats;

export { data };

export default {
  load(): RepoStats {
    const statsPath = resolve(__dirname, 'repo-stats.json');

    if (!existsSync(statsPath)) {
      console.warn('⚠️ repo-stats.json not found. Run "pnpm stats:generate" to generate it.');
      return emptyStats;
    }

    try {
      const content = readFileSync(statsPath, 'utf-8');
      return JSON.parse(content) as RepoStats;
    } catch (error) {
      console.error('Error loading repo-stats.json:', error);
      return emptyStats;
    }
  },
};
