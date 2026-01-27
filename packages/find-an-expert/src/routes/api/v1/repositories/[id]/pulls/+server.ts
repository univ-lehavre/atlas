import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getGitHubStats } from '$lib/server/github';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * Response structure for pull requests endpoint.
 */
interface PullRequestsResponse {
  open: number;
  closed: number;
}

/**
 * GET /api/v1/repositories/:id/pulls
 * Returns GitHub pull request statistics for the repository.
 *
 * Path parameters:
 * - id: Repository identifier (currently accepts any value, uses current repo)
 */
export const GET: RequestHandler = async () => {
  try {
    const repoPath = process.cwd();
    const stats = await getGitHubStats(repoPath);

    const response: PullRequestsResponse = {
      open: stats.pullRequests.open,
      closed: stats.pullRequests.closed,
    };

    return json(response);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
