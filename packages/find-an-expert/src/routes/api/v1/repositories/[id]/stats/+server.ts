import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getRepositoryStats } from '$lib/server/git-stats';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * GET /api/v1/repositories/:id/stats
 * Returns comprehensive repository statistics including commits, code metrics, and GitHub data.
 *
 * Path parameters:
 * - id: Repository identifier (currently accepts any value, uses current repo)
 */
export const GET: RequestHandler = async () => {
  try {
    const stats = await getRepositoryStats();
    return json(stats);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
