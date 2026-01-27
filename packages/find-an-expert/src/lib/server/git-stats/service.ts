import { GitRepository } from './repository';
import { analyzeDirectory } from './code-analyzer';
import { aggregateByHour, findDateRange, calculateTotals } from './aggregator';
import { getGitHubStats, emptyGitHubStats } from '$lib/server/github';
import type { TRepositoryStats } from './types';
import { emptyCodeStats, emptyTestStats } from './types';

/**
 * Gets comprehensive repository statistics.
 * @param repoPath - Path to the git repository (defaults to current working directory)
 * @returns Repository statistics including commits, code, test, and GitHub metrics
 */
export const getRepositoryStats = async (
  repoPath: string = process.cwd()
): Promise<TRepositoryStats> => {
  const repo = new GitRepository(repoPath);

  const [commits, codeAnalysis, github] = await Promise.all([
    repo.getCommitLog(),
    analyzeDirectory(repoPath),
    getGitHubStats(repoPath),
  ]);

  const { code: currentCode, tests: currentTests } = codeAnalysis;

  const hourlyStats = aggregateByHour(commits);

  const { firstCommitDate, lastCommitDate } = findDateRange(commits);

  const { totalAdditions, totalDeletions } = calculateTotals(commits);

  return {
    totalCommits: commits.length,
    totalAdditions,
    totalDeletions,
    firstCommitDate,
    lastCommitDate,
    currentCode,
    currentTests,
    hourlyStats,
    github,
  };
};

/**
 * Gets empty repository statistics (for error cases or new repos).
 * @returns Empty repository statistics
 */
export const emptyRepositoryStats = (): TRepositoryStats => ({
  totalCommits: 0,
  totalAdditions: 0,
  totalDeletions: 0,
  firstCommitDate: null,
  lastCommitDate: null,
  currentCode: emptyCodeStats(),
  currentTests: emptyTestStats(),
  hourlyStats: [],
  github: emptyGitHubStats(),
});
