import {
  type TCommitStats,
  type TPeriodStats,
  type TCodeStats,
  type TCodeDelta,
  type TTestStats,
  emptyCodeStats,
  emptyTestStats,
  emptyCodeDelta,
} from './types';

/**
 * Formats a date to hourly period string (ISO format: "YYYY-MM-DDTHH").
 * @param date - Date to format
 * @returns Period string
 */
export const formatHourlyPeriod = (date: Date): string => {
  return date.toISOString().slice(0, 13);
};

/**
 * Groups commits by hourly period.
 * @param commits - Array of commit statistics
 * @returns Map of period to commits
 */
export const groupCommitsByHour = (commits: TCommitStats[]): Map<string, TCommitStats[]> => {
  const groups = new Map<string, TCommitStats[]>();

  for (const commit of commits) {
    const period = formatHourlyPeriod(commit.timestamp);
    const existing = groups.get(period) || [];
    existing.push(commit);
    groups.set(period, existing);
  }

  return groups;
};

/**
 * Calculates aggregated statistics for a group of commits.
 * @param period - Period string
 * @param commits - Commits in this period
 * @returns Aggregated period statistics
 */
export const aggregatePeriodStats = (period: string, commits: TCommitStats[]): TPeriodStats => {
  const authors = new Set<string>();
  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;

  for (const commit of commits) {
    authors.add(commit.author);
    additions += commit.additions;
    deletions += commit.deletions;
    filesChanged += commit.filesChanged;
  }

  return {
    period,
    commits: commits.length,
    additions,
    deletions,
    filesChanged,
    authors: Array.from(authors),
    codeDelta: emptyCodeDelta(),
    testDelta: emptyTestStats(),
  };
};

/**
 * Aggregates commits by hour.
 * @param commits - Array of commit statistics
 * @returns Array of period statistics sorted by period (ascending)
 */
export const aggregateByHour = (commits: TCommitStats[]): TPeriodStats[] => {
  const groups = groupCommitsByHour(commits);
  const result: TPeriodStats[] = [];

  for (const [period, periodCommits] of groups) {
    result.push(aggregatePeriodStats(period, periodCommits));
  }

  return result.sort((a, b) => a.period.localeCompare(b.period));
};

/**
 * Calculates total statistics from commits.
 * @param commits - Array of commit statistics
 * @returns Total additions, deletions, and file count
 */
export const calculateTotals = (
  commits: TCommitStats[]
): { totalAdditions: number; totalDeletions: number; totalFilesChanged: number } => {
  let totalAdditions = 0;
  let totalDeletions = 0;
  let totalFilesChanged = 0;

  for (const commit of commits) {
    totalAdditions += commit.additions;
    totalDeletions += commit.deletions;
    totalFilesChanged += commit.filesChanged;
  }

  return { totalAdditions, totalDeletions, totalFilesChanged };
};

/**
 * Adds two code statistics together.
 * @param a - First code stats
 * @param b - Second code stats
 * @returns Sum of both stats
 */
export const addCodeStats = (a: TCodeStats, b: TCodeStats): TCodeStats => ({
  files: a.files + b.files,
  constants: a.constants + b.constants,
  functions: a.functions + b.functions,
  types: a.types + b.types,
});

/**
 * Adds two test statistics together.
 * @param a - First test stats
 * @param b - Second test stats
 * @returns Sum of both stats
 */
export const addTestStats = (a: TTestStats, b: TTestStats): TTestStats => ({
  files: a.files + b.files,
  describes: a.describes + b.describes,
  tests: a.tests + b.tests,
});

/**
 * Calculates code delta between before and after states.
 * @param before - Code stats before changes
 * @param after - Code stats after changes
 * @returns Delta object with added/modified/deleted
 */
export const calculateCodeDelta = (before: TCodeStats, after: TCodeStats): TCodeDelta => {
  const delta: TCodeDelta = {
    added: emptyCodeStats(),
    modified: emptyCodeStats(),
    deleted: emptyCodeStats(),
  };

  const filesDiff = after.files - before.files;
  if (filesDiff > 0) {
    delta.added.files = filesDiff;
  } else if (filesDiff < 0) {
    delta.deleted.files = Math.abs(filesDiff);
  }

  const constantsDiff = after.constants - before.constants;
  if (constantsDiff > 0) {
    delta.added.constants = constantsDiff;
  } else if (constantsDiff < 0) {
    delta.deleted.constants = Math.abs(constantsDiff);
  }

  const functionsDiff = after.functions - before.functions;
  if (functionsDiff > 0) {
    delta.added.functions = functionsDiff;
  } else if (functionsDiff < 0) {
    delta.deleted.functions = Math.abs(functionsDiff);
  }

  const typesDiff = after.types - before.types;
  if (typesDiff > 0) {
    delta.added.types = typesDiff;
  } else if (typesDiff < 0) {
    delta.deleted.types = Math.abs(typesDiff);
  }

  return delta;
};

/**
 * Finds the earliest and latest commit dates.
 * @param commits - Array of commit statistics
 * @returns First and last commit dates, or null if empty
 */
export const findDateRange = (
  commits: TCommitStats[]
): { firstCommitDate: Date | null; lastCommitDate: Date | null } => {
  if (commits.length === 0) {
    return { firstCommitDate: null, lastCommitDate: null };
  }

  let firstCommitDate = commits[0].timestamp;
  let lastCommitDate = commits[0].timestamp;

  for (const commit of commits) {
    if (commit.timestamp < firstCommitDate) {
      firstCommitDate = commit.timestamp;
    }
    if (commit.timestamp > lastCommitDate) {
      lastCommitDate = commit.timestamp;
    }
  }

  return { firstCommitDate, lastCommitDate };
};
