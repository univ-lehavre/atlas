import { json, type RequestHandler } from '@sveltejs/kit';

import { logout } from '$lib/server/services/auth';
import { validateUserId } from '$lib/server/validators/auth';
import { mapErrorToResponse } from '$lib/errors/mapper';

export const POST: RequestHandler = async ({ locals, cookies }) => {
  try {
    const userId = validateUserId(locals.userId);

    await logout(userId, cookies);

    return json({ data: { loggedOut: true }, error: null }, { status: 200 });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
