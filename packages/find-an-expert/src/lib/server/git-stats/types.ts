import { z } from 'zod';
import { GitHubStats, type TGitHubStats, emptyGitHubStats } from '$lib/server/github';

// Re-export GitHub types for convenience
export { type TGitHubStats, emptyGitHubStats };

/**
 * Statistics for a single commit.
 */
export const CommitStats = z.object({
  hash: z.string(),
  timestamp: z.date(),
  author: z.string(),
  message: z.string(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  filesChanged: z.number().int().nonnegative(),
});

export type TCommitStats = z.infer<typeof CommitStats>;

/**
 * Statistics for TypeScript source code files.
 */
export const CodeStats = z.object({
  files: z.number().int().nonnegative(),
  constants: z.number().int().nonnegative(),
  functions: z.number().int().nonnegative(),
  types: z.number().int().nonnegative(),
});

export type TCodeStats = z.infer<typeof CodeStats>;

/**
 * Statistics for test files (*.spec.ts, *.test.ts).
 */
export const TestStats = z.object({
  files: z.number().int().nonnegative(),
  describes: z.number().int().nonnegative(),
  tests: z.number().int().nonnegative(),
});

export type TTestStats = z.infer<typeof TestStats>;

/**
 * Code delta representing added/modified/deleted statistics.
 */
export const CodeDelta = z.object({
  added: CodeStats,
  modified: CodeStats,
  deleted: CodeStats,
});

export type TCodeDelta = z.infer<typeof CodeDelta>;

/**
 * Statistics aggregated by time period (hourly).
 */
export const PeriodStats = z.object({
  period: z.string(),
  commits: z.number().int().nonnegative(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  filesChanged: z.number().int().nonnegative(),
  authors: z.array(z.string()),
  codeDelta: CodeDelta,
  testDelta: TestStats,
});

export type TPeriodStats = z.infer<typeof PeriodStats>;

/**
 * Global repository statistics.
 */
export const RepositoryStats = z.object({
  totalCommits: z.number().int().nonnegative(),
  totalAdditions: z.number().int().nonnegative(),
  totalDeletions: z.number().int().nonnegative(),
  firstCommitDate: z.date().nullable(),
  lastCommitDate: z.date().nullable(),
  currentCode: CodeStats,
  currentTests: TestStats,
  hourlyStats: z.array(PeriodStats),
  github: GitHubStats,
});

export type TRepositoryStats = z.infer<typeof RepositoryStats>;

/**
 * Creates empty code statistics.
 */
export const emptyCodeStats = (): TCodeStats => ({
  files: 0,
  constants: 0,
  functions: 0,
  types: 0,
});

/**
 * Creates empty test statistics.
 */
export const emptyTestStats = (): TTestStats => ({
  files: 0,
  describes: 0,
  tests: 0,
});

/**
 * Creates empty code delta.
 */
export const emptyCodeDelta = (): TCodeDelta => ({
  added: emptyCodeStats(),
  modified: emptyCodeStats(),
  deleted: emptyCodeStats(),
});
