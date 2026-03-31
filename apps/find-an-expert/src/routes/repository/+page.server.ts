import type { PageServerLoad } from './$types';
import { getRepositoryStats, type TRepositoryStats } from '$lib/server/git-stats';
import {
  buildGitHubUrl,
  buildIssuesUrl,
  buildNewIssueUrl,
  buildPullRequestsUrl,
  buildDiscussionsUrl,
  getGitHubRepoFromPath,
} from '$lib/server/github';

interface GitHubUrls {
  repository: string | null;
  issues: string | null;
  newIssue: string | null;
  pullRequests: string | null;
  discussions: string | null;
}

/**
 * Builds GitHub URLs from repository info.
 */
const buildGitHubUrls = async (repoPath: string): Promise<GitHubUrls> => {
  const repoInfo = await getGitHubRepoFromPath(repoPath);

  if (!repoInfo) {
    return {
      repository: null,
      issues: null,
      newIssue: null,
      pullRequests: null,
      discussions: null,
    };
  }

  const { owner, repo } = repoInfo;

  return {
    repository: buildGitHubUrl(owner, repo),
    issues: buildIssuesUrl(owner, repo),
    newIssue: buildNewIssueUrl(owner, repo),
    pullRequests: buildPullRequestsUrl(owner, repo),
    discussions: buildDiscussionsUrl(owner, repo),
  };
};

export const load: PageServerLoad = async () => {
  const repoPath = process.cwd();

  try {
    const [stats, githubUrls] = await Promise.all([
      getRepositoryStats(repoPath),
      buildGitHubUrls(repoPath),
    ]);

    return {
      stats: stats as TRepositoryStats,
      error: null,
      githubUrls,
    };
  } catch (err) {
    return {
      stats: null,
      error: err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques',
      githubUrls: null,
    };
  }
};
