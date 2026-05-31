import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { getWorksCount } from '$lib/server/citation';
import { flatErrorMapper } from '$lib/server/http';

/** Maximum number of institutions allowed in a single request */
const MAX_INSTITUTIONS = 10;

/**
 * GET /api/v1/works/counts
 * Returns the count of articles published by the specified institutions in the last 5 years.
 */
export const GET: RequestHandler = withHandler(
  async ({ url, locals }) => {
    if (!locals.userId)
      throw new ApplicationError('unauthenticated', 401, 'User not authenticated');

    const institutionsParam = url.searchParams.get('institutions');

    if (!institutionsParam)
      throw new ApplicationError('missing_parameter', 400, 'institutions parameter is required');

    const institutionIds = institutionsParam.split(',').filter(Boolean);

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

    return getWorksCount(institutionIds);
  },
  { mapError: flatErrorMapper }
);
