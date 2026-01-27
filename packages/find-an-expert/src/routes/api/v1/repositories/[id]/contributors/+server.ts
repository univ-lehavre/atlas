import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { mapErrorToResponse } from '$lib/server/http';

/**
 * Response structure for contributors endpoint.
 */
interface ContributorsResponse {
  contributors: never[];
  message: string;
}

/**
 * GET /api/v1/repositories/:id/contributors
 * Returns the list of contributors for the repository.
 *
 * Path parameters:
 * - id: Repository identifier (currently accepts any value, uses current repo)
 *
 * Note: This is a stub endpoint. Full implementation pending.
 */
export const GET: RequestHandler = async () => {
  try {
    const response: ContributorsResponse = {
      contributors: [],
      message: 'Contributors endpoint not yet implemented',
    };

    return json(response);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
