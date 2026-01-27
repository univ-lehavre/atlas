import { json, type RequestHandler } from '@sveltejs/kit';

import { logout } from '$lib/server/services/authService';
import { validateUserId } from '$lib/validators/server/auth';
import { mapErrorToResponse } from '$lib/errors/mapper';

export const POST: RequestHandler = async ({ locals, cookies }) => {
  try {
    // Validate user ID from locals
    const userId = validateUserId(locals.userId);

    // Perform logout
    await logout(userId, cookies);

    return json({ data: { loggedOut: true }, error: null }, { status: 200 });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
