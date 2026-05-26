import { json } from '@sveltejs/kit';

import { mapErrorToResponse } from '$lib/errors/mapper';
import { getProfileState } from '$lib/server/services/profile';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return json(
        {
          data: null,
          error: { code: 'unauthenticated', message: 'User not authenticated' },
        },
        { status: 401 }
      );
    }
    const state = await getProfileState(userId, { fetch });
    return json({ data: state, error: null });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
