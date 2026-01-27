import simpleGit, { type SimpleGit, type LogResult, type DefaultLogFields } from 'simple-git';
import type { TCommitStats } from './types';

/**
 * Interface for git repository operations.
 */
export interface GitRepositoryInterface {
  getCommitLog(since?: Date, until?: Date): Promise<TCommitStats[]>;
  getFileContent(filePath: string): Promise<string>;
  getFileContentAtCommit(hash: string, filePath: string): Promise<string>;
  getChangedFiles(hash: string): Promise<ChangedFile[]>;
}

/**
 * Represents a file changed in a commit.
 */
export interface ChangedFile {
  path: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted';
}

/**
 * Parses numstat output line into ChangedFile.
 * Format: "additions\tdeletions\tfilepath"
 */
export const parseNumstatLine = (line: string): ChangedFile | null => {
  const parts = line.split('\t');
  if (parts.length !== 3) return null;

  const [addStr, delStr, path] = parts;
  if (!path) return null;

  const additions = addStr === '-' ? 0 : parseInt(addStr, 10);
  const deletions = delStr === '-' ? 0 : parseInt(delStr, 10);

  if (isNaN(additions) || isNaN(deletions)) return null;

  let status: ChangedFile['status'] = 'modified';
  if (additions > 0 && deletions === 0) status = 'added';
  if (additions === 0 && deletions > 0) status = 'deleted';

  return { path, additions, deletions, status };
};

/**
 * Parses git log output into CommitStats array.
 */
const parseGitLog = (log: LogResult<DefaultLogFields & { numstat?: string }>): TCommitStats[] => {
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
 * Git repository implementation using simple-git.
 */
export class GitRepository implements GitRepositoryInterface {
  private readonly git: SimpleGit;
  private readonly repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Gets the commit log with statistics.
   * @param since - Start date filter
   * @param until - End date filter
   * @returns Array of commit statistics
   */
  async getCommitLog(since?: Date, until?: Date): Promise<TCommitStats[]> {
    const options: Record<string, string | null> = {
      '--stat': null,
      '--all': null,
    };

    if (since) {
      options['--since'] = since.toISOString();
    }
    if (until) {
      options['--until'] = until.toISOString();
    }

    const log = await this.git.log(options);
    return parseGitLog(log);
  }

  /**
   * Gets the content of a file at HEAD.
   * @param filePath - Path to the file relative to repo root
   * @returns File content as string
   */
  async getFileContent(filePath: string): Promise<string> {
    return this.git.show([`HEAD:${filePath}`]);
  }

  /**
   * Gets the content of a file at a specific commit.
   * @param hash - Commit hash
   * @param filePath - Path to the file relative to repo root
   * @returns File content as string
   */
  async getFileContentAtCommit(hash: string, filePath: string): Promise<string> {
    return this.git.show([`${hash}:${filePath}`]);
  }

  /**
   * Gets the list of changed files in a commit with their statistics.
   * @param hash - Commit hash
   * @returns Array of changed files
   */
  async getChangedFiles(hash: string): Promise<ChangedFile[]> {
    const result = await this.git.raw(['diff-tree', '--numstat', '-r', '--root', hash]);
    const lines = result.trim().split('\n').filter(Boolean);
    const files: ChangedFile[] = [];

    for (const line of lines) {
      const parsed = parseNumstatLine(line);
      if (parsed) {
        files.push(parsed);
      }
    }

    return files;
  }

  /**
   * Gets the repository path.
   */
  getRepoPath(): string {
    return this.repoPath;
  }
}
