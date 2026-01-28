/**
 * Git repository analyzer using simple-git.
 * @module
 */

import simpleGit, { type SimpleGit, type LogResult, type DefaultLogFields } from 'simple-git';
import type { TimelineEntry } from './types.js';

/**
 * Commit statistics.
 */
export interface CommitStats {
  hash: string;
  timestamp: Date;
  author: string;
  message: string;
  additions: number;
  deletions: number;
  filesChanged: number;
}

/**
 * Parses git log output into CommitStats array.
 */
const parseGitLog = (log: LogResult<DefaultLogFields>): CommitStats[] => {
  return log.all.map((commit) => {
    let additions = 0;
    let deletions = 0;
    let filesChanged = 0;

    if (commit.diff) {
      additions = commit.diff.insertions;
      deletions = commit.diff.deletions;
      filesChanged = commit.diff.files.length;
    }

    return {
      hash: commit.hash,
      timestamp: new Date(commit.date),
      author: commit.author_name,
      message: commit.message,
      additions,
      deletions,
      filesChanged,
    };
  });
};

/**
 * Git repository analyzer class.
 */
export class GitAnalyzer {
  private readonly git: SimpleGit;
  private readonly repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Gets all commits from the repository.
   */
  async getAllCommits(): Promise<CommitStats[]> {
    const log = await this.git.log({
      '--stat': null,
      '--all': null,
    });
    return parseGitLog(log);
  }

  /**
   * Gets commits for a specific path/package.
   */
  async getCommitsForPath(path: string): Promise<CommitStats[]> {
    try {
      const log = await this.git.log({
        '--stat': null,
        '--': null,
        [path]: null,
      });
      return parseGitLog(log);
    } catch {
      return [];
    }
  }

  /**
   * Gets the latest commit date for a path.
   */
  async getLatestCommitForPath(path: string): Promise<string | null> {
    try {
      const log = await this.git.log({
        '-1': null,
        '--': null,
        [path]: null,
      });
      if (log.latest) {
        return log.latest.date;
      }
    } catch {
      // Path has no commits
    }
    return null;
  }

  /**
   * Gets repository root path.
   */
  getRepoPath(): string {
    return this.repoPath;
  }
}

/**
 * Formats a date to daily period string (YYYY-MM-DD).
 */
export const formatDailyPeriod = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

/**
 * Formats a date to monthly period string (YYYY-MM).
 */
export const formatMonthlyPeriod = (date: Date): string => {
  return date.toISOString().slice(0, 7);
};

/**
 * Groups commits by period using a formatter function.
 */
const groupCommitsByPeriod = (
  commits: CommitStats[],
  formatter: (date: Date) => string
): Map<string, CommitStats[]> => {
  const groups = new Map<string, CommitStats[]>();

  for (const commit of commits) {
    const period = formatter(commit.timestamp);
    const existing = groups.get(period) || [];
    existing.push(commit);
    groups.set(period, existing);
  }

  return groups;
};

/**
 * Aggregates commits into timeline entries.
 */
const aggregateToTimeline = (groups: Map<string, CommitStats[]>): TimelineEntry[] => {
  const entries: TimelineEntry[] = [];

  for (const [period, commits] of groups) {
    let additions = 0;
    let deletions = 0;
    let filesChanged = 0;

    for (const commit of commits) {
      additions += commit.additions;
      deletions += commit.deletions;
      filesChanged += commit.filesChanged;
    }

    entries.push({
      period,
      commits: commits.length,
      additions,
      deletions,
      filesChanged,
    });
  }

  return entries.sort((a, b) => a.period.localeCompare(b.period));
};

/**
 * Aggregates commits by day.
 */
export const aggregateByDay = (commits: CommitStats[]): TimelineEntry[] => {
  const groups = groupCommitsByPeriod(commits, formatDailyPeriod);
  return aggregateToTimeline(groups);
};

/**
 * Aggregates commits by month.
 */
export const aggregateByMonth = (commits: CommitStats[]): TimelineEntry[] => {
  const groups = groupCommitsByPeriod(commits, formatMonthlyPeriod);
  return aggregateToTimeline(groups);
};

/**
 * Calculates total statistics from commits.
 */
export const calculateTotals = (
  commits: CommitStats[]
): { totalAdditions: number; totalDeletions: number } => {
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const commit of commits) {
    totalAdditions += commit.additions;
    totalDeletions += commit.deletions;
  }

  return { totalAdditions, totalDeletions };
};

/**
 * Finds the earliest and latest commit dates.
 */
export const findDateRange = (
  commits: CommitStats[]
): { firstCommit: string | null; lastCommit: string | null } => {
  if (commits.length === 0) {
    return { firstCommit: null, lastCommit: null };
  }

  let firstCommit = commits[0].timestamp;
  let lastCommit = commits[0].timestamp;

  for (const commit of commits) {
    if (commit.timestamp < firstCommit) {
      firstCommit = commit.timestamp;
    }
    if (commit.timestamp > lastCommit) {
      lastCommit = commit.timestamp;
    }
  }

  return {
    firstCommit: firstCommit.toISOString(),
    lastCommit: lastCommit.toISOString(),
  };
};
