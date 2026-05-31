import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { getInstitutionStats } from '$lib/server/citation';
import { flatErrorMapper } from '$lib/server/http';

/**
 * GET /api/v1/institutions/:id/stats
 * Returns comprehensive statistics for a single institution over the last 5 years.
 */
export const GET: RequestHandler = withHandler(
  async ({ params, locals }) => {
    if (!locals.userId)
      throw new ApplicationError('unauthenticated', 401, 'User not authenticated');

    const institutionId = params.id;

    if (!institutionId)
      throw new ApplicationError('missing_parameter', 400, 'Institution ID is required');

    return getInstitutionStats([institutionId]);
  },
  { mapError: flatErrorMapper }
);
