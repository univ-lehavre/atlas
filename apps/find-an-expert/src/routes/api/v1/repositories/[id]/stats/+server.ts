import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { getRepositoryStats } from '$lib/server/git-stats';
import { flatErrorMapper } from '$lib/server/http';

/**
 * GET /api/v1/repositories/:id/stats
 * Returns comprehensive repository statistics.
 */
export const GET: RequestHandler = withHandler(async () => getRepositoryStats(), {
  mapError: flatErrorMapper,
});
