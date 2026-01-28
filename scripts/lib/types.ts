/**
 * Types for repository statistics generation.
 * @module
 */

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
  /** Period string: "2024-01-15" (daily) or "2024-01" (monthly) */
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
 * Complete repository statistics output.
 */
export interface RepoStatsOutput {
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
 * Creates empty code statistics.
 */
export const emptyCodeStats = (): CodeStats => ({
  files: 0,
  functions: 0,
  types: 0,
  interfaces: 0,
  constants: 0,
});

/**
 * Creates empty test statistics.
 */
export const emptyTestStats = (): TestStats => ({
  files: 0,
  describes: 0,
  tests: 0,
});
