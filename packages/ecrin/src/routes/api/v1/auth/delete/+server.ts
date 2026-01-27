import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { deleteUser } from '$lib/server/services/authService';
import { validateUserId } from '$lib/validators/server/auth';
import { mapErrorToResponse } from '$lib/errors/mapper';

export const POST: RequestHandler = async ({ cookies, locals }) => {
  try {
    // Validate user ID
    const userId = validateUserId(locals.userId);

    // Delete user
    await deleteUser(userId, cookies);

    return json({ data: { deleted: true }, error: null });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
