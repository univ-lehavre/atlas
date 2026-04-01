import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getInstitutionStats } from '$lib/server/openalex';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * GET /api/v1/institutions/:id/stats
 * Returns comprehensive statistics for a single institution over the last 5 years.
 * Includes works count (all types), articles count, and authors count.
 *
 * Requires authentication.
 *
 * Path parameters:
 * - id: OpenAlex institution ID
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    // Require authentication
    if (!locals.userId) {
      return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
    }

    const institutionId = params.id;

    if (!institutionId) {
      return json(
        { code: 'missing_parameter', message: 'Institution ID is required' },
        { status: 400 }
      );
    }

    const result = await getInstitutionStats([institutionId]);
    return json(result);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
