import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAllConsents } from '$lib/server/consent';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * GET /api/v1/consents
 * Returns the list of all consents for the authenticated user.
 *
 * Response:
 * - consents: Array of consent status objects
 */
export const GET: RequestHandler = async ({ locals }) => {
  try {
    if (!locals.userId) {
      return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
    }

    const consents = await getAllConsents(locals.userId);
    return json({ consents });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
