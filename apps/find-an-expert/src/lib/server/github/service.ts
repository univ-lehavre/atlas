import simpleGit from 'simple-git';
import type { TGitHubStats, TGitHubRepo } from './types';
import { emptyGitHubStats } from './types';

/**
 * Parses GitHub repository URL to extract owner and repo name.
 * @param url - Git remote URL (HTTPS or SSH format)
 * @returns Object with owner and repo, or null if not a GitHub URL
 */
export const parseGitHubUrl = (url: string): TGitHubRepo | null => {
  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(/github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
};

/**
 * Builds the GitHub web URL for a repository.
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns GitHub URL
 */
export const buildGitHubUrl = (owner: string, repo: string): string => {
  return `https://github.com/${owner}/${repo}`;
};

/**
 * Builds the GitHub issues URL for a repository.
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns GitHub issues URL
 */
export const buildIssuesUrl = (owner: string, repo: string): string => {
  return `https://github.com/${owner}/${repo}/issues`;
};

/**
 * Builds the GitHub new issue URL for a repository.
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns GitHub new issue URL
 */
export const buildNewIssueUrl = (owner: string, repo: string): string => {
  return `https://github.com/${owner}/${repo}/issues/new`;
};

/**
 * Builds the GitHub pull requests URL for a repository.
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns GitHub pull requests URL
 */
export const buildPullRequestsUrl = (owner: string, repo: string): string => {
  return `https://github.com/${owner}/${repo}/pulls`;
};

/**
 * Builds the GitHub discussions URL for a repository.
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns GitHub discussions URL
 */
export const buildDiscussionsUrl = (owner: string, repo: string): string => {
  return `https://github.com/${owner}/${repo}/discussions`;
};

/**
 * Gets the GitHub remote URL from the repository.
 * @param repoPath - Path to the git repository
 * @returns GitHub repo info or null if not found
 */
export const getGitHubRepoFromPath = async (repoPath: string): Promise<TGitHubRepo | null> => {
  const git = simpleGit(repoPath);

  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');

    if (origin?.refs?.fetch) {
      return parseGitHubUrl(origin.refs.fetch);
    }
  } catch {
    // Repository might not have remotes
  }

  return null;
};

/**
 * Fetches GitHub API data for issues or pull requests.
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param type - 'issues' or 'pulls'
 * @param state - 'open' or 'closed'
 * @returns Count of items
 */
const fetchGitHubCount = async (
  owner: string,
  repo: string,
  type: 'issues' | 'pulls',
  state: 'open' | 'closed'
): Promise<number> => {
  const url = `https://api.github.com/repos/${owner}/${repo}/${type}?state=${state}&per_page=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'talent-finder-stats',
      },
    });

    if (!response.ok) {
      return 0;
    }

    // GitHub returns total count in Link header for pagination
    const linkHeader = response.headers.get('Link');
    if (linkHeader) {
      const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      if (lastMatch) {
        return parseInt(lastMatch[1], 10);
      }
    }

    // If no pagination, count items in response
    const data = await response.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
};

/**
 * Fetches GitHub statistics for a repository.
 * @param repoPath - Path to the git repository
 * @returns GitHub statistics including issues and pull requests
 */
export const getGitHubStats = async (repoPath: string): Promise<TGitHubStats> => {
  const repoInfo = await getGitHubRepoFromPath(repoPath);

  if (!repoInfo) {
    return emptyGitHubStats();
  }

  const { owner, repo } = repoInfo;
  const repoUrl = buildGitHubUrl(owner, repo);

  const [openIssues, closedIssues, openPRs, closedPRs] = await Promise.all([
    fetchGitHubCount(owner, repo, 'issues', 'open'),
    fetchGitHubCount(owner, repo, 'issues', 'closed'),
    fetchGitHubCount(owner, repo, 'pulls', 'open'),
    fetchGitHubCount(owner, repo, 'pulls', 'closed'),
  ]);

  return {
    issues: {
      open: openIssues,
      closed: closedIssues,
    },
    pullRequests: {
      open: openPRs,
      closed: closedPRs,
    },
    repoUrl,
  };
};
