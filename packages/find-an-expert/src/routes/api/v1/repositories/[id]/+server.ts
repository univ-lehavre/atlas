import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import {
  getGitHubRepoFromPath,
  buildGitHubUrl,
  buildIssuesUrl,
  buildNewIssueUrl,
  buildPullRequestsUrl,
  buildDiscussionsUrl,
} from '$lib/server/github';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * Response structure for repository detail endpoint.
 */
interface RepositoryDetailResponse {
  id: string;
  name: string | null;
  owner: string | null;
  urls: {
    repository: string | null;
    issues: string | null;
    newIssue: string | null;
    pullRequests: string | null;
    discussions: string | null;
  };
}

/**
 * GET /api/v1/repositories/:id
 * Returns repository details and URLs.
 *
 * Path parameters:
 * - id: Repository identifier (currently accepts any value, uses current repo)
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const repoPath = process.cwd();
    const repoInfo = await getGitHubRepoFromPath(repoPath);

    let urls: RepositoryDetailResponse['urls'] = {
      repository: null,
      issues: null,
      newIssue: null,
      pullRequests: null,
      discussions: null,
    };

    let name: string | null = null;
    let owner: string | null = null;

    if (repoInfo) {
      owner = repoInfo.owner;
      name = repoInfo.repo;
      urls = {
        repository: buildGitHubUrl(owner, name),
        issues: buildIssuesUrl(owner, name),
        newIssue: buildNewIssueUrl(owner, name),
        pullRequests: buildPullRequestsUrl(owner, name),
        discussions: buildDiscussionsUrl(owner, name),
      };
    }

    const response: RepositoryDetailResponse = {
      id: params.id,
      name,
      owner,
      urls,
    };

    return json(response);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
