import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { getInstitutionStats } from '$lib/server/citation';
import { flatErrorMapper } from '$lib/server/http';

/** Maximum number of institutions allowed in a single request */
const MAX_INSTITUTIONS = 10;

/**
 * GET /api/v1/institutions/stats
 * Returns comprehensive statistics for the specified institutions over the last 5 years.
 */
export const GET: RequestHandler = withHandler(
  async ({ url, locals }) => {
    if (!locals.userId)
      throw new ApplicationError('unauthenticated', 401, 'User not authenticated');

    const idsParam = url.searchParams.get('ids');

    if (!idsParam)
      throw new ApplicationError('missing_parameter', 400, 'ids parameter is required');

    const institutionIds = idsParam.split(',').filter(Boolean);

    if (institutionIds.length === 0)
      throw new ApplicationError(
        'invalid_parameter',
        400,
        'At least one institution ID is required'
      );

    if (institutionIds.length > MAX_INSTITUTIONS)
      throw new ApplicationError(
        'too_many_institutions',
        400,
        `Maximum ${MAX_INSTITUTIONS} institutions allowed`
      );

    return getInstitutionStats(institutionIds);
  },
  { mapError: flatErrorMapper }
);
