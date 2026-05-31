import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { getGitHubStats } from '$lib/server/github';
import { flatErrorMapper } from '$lib/server/http';

interface IssuesResponse {
  open: number;
  closed: number;
}

/**
 * GET /api/v1/repositories/:id/issues
 * Returns GitHub issues statistics for the repository.
 */
export const GET: RequestHandler = withHandler(
  async (): Promise<IssuesResponse> => {
    const repoPath = process.cwd();
    const stats = await getGitHubStats(repoPath);
    return { open: stats.issues.open, closed: stats.issues.closed };
  },
  { mapError: flatErrorMapper }
);
