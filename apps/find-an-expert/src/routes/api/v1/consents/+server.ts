import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { getAllConsents } from '$lib/server/consent';
import { flatErrorMapper } from '$lib/server/http';

/**
 * GET /api/v1/consents
 * Returns the list of all consents for the authenticated user.
 *
 * Response:
 * - consents: Array of consent status objects
 */
export const GET: RequestHandler = withHandler(
  async ({ locals }) => {
    if (!locals.userId)
      throw new ApplicationError('unauthenticated', 401, 'User not authenticated');

    const consents = await getAllConsents(locals.userId);
    return { consents };
  },
  { mapError: flatErrorMapper }
);
