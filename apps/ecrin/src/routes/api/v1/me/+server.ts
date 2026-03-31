import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProfile } from '$lib/server/services/profileService';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return json(
        { data: null, error: { code: 'unauthenticated', message: 'User not authenticated' } },
        { status: 401 }
      );
    }
    const payload = await getProfile(userId);
    return json({ data: payload, error: null });
  } catch (error: unknown) {
    console.log(error);
    return json(
      { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
};
