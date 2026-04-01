import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProfile } from '$lib/server/user';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * GET /api/v1/users/me
 * Returns the profile of the authenticated user.
 */
export const GET: RequestHandler = async ({ locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
    }
    const payload = await getProfile(userId);
    return json(payload);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
