import { json } from '@sveltejs/kit';
import { listUsersFromRedcap } from '$lib/server/services/userService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, fetch }) => {
  try {
    if (!locals.userId) {
      return json(
        { data: null, error: { code: 'unauthenticated', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const users = await listUsersFromRedcap(fetch);

    return json({ data: users, error: null });
  } catch (error: unknown) {
    console.log(error);
    return json(
      { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
};
