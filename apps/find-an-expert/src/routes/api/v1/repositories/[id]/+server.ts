import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createRateLimiter, rateLimitHeaders } from '@univ-lehavre/atlas-auth';

import {
  getGitHubRepoFromPath,
  buildGitHubUrl,
  buildIssuesUrl,
  buildNewIssueUrl,
  buildPullRequestsUrl,
  buildDiscussionsUrl,
} from '$lib/server/github';
import { mapErrorToResponse } from '$lib/server/http';

// Endpoint public sans gate d'auth — rate-limit par-IP pour éviter
// l'énumération brute (Phase 6.5 DevSecOps, flagué dans
// docs/security/surfaces.md).
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

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
export const GET: RequestHandler = async ({ params, getClientAddress }) => {
  const rate = limiter.check(getClientAddress());
  if (!rate.ok) {
    return json(
      { code: 'rate_limited', message: 'Trop de requêtes, réessayez plus tard.' },
      { status: 429, headers: rateLimitHeaders(rate, limiter.limit) }
    );
  }

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

    return json(response, { headers: rateLimitHeaders(rate, limiter.limit) });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
