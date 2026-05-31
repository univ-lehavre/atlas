import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { getProfile } from '$lib/server/user';
import { flatErrorMapper } from '$lib/server/http';

/**
 * GET /api/v1/users/me
 * Returns the profile of the authenticated user.
 */
export const GET: RequestHandler = withHandler(
  async ({ locals }) => {
    const userId = locals.userId;
    if (!userId) throw new ApplicationError('unauthenticated', 401, 'User not authenticated');
    return getProfile(userId);
  },
  { mapError: flatErrorMapper }
);
