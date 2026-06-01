import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { getGitHubStats } from '$lib/server/github';
import { flatErrorMapper } from '$lib/server/http';

interface PullRequestsResponse {
  open: number;
  closed: number;
}

/**
 * GET /api/v1/repositories/:id/pulls
 * Returns GitHub pull request statistics for the repository.
 */
export const GET: RequestHandler = withHandler(
  async (): Promise<PullRequestsResponse> => {
    const repoPath = process.cwd();
    const stats = await getGitHubStats(repoPath);
    return { open: stats.pullRequests.open, closed: stats.pullRequests.closed };
  },
  { mapError: flatErrorMapper }
);
