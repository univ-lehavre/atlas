import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getGitHubStats } from '$lib/server/github';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * Response structure for issues endpoint.
 */
interface IssuesResponse {
  open: number;
  closed: number;
}

/**
 * GET /api/v1/repositories/:id/issues
 * Returns GitHub issues statistics for the repository.
 *
 * Path parameters:
 * - id: Repository identifier (currently accepts any value, uses current repo)
 */
export const GET: RequestHandler = async () => {
  try {
    const repoPath = process.cwd();
    const stats = await getGitHubStats(repoPath);

    const response: IssuesResponse = {
      open: stats.issues.open,
      closed: stats.issues.closed,
    };

    return json(response);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
