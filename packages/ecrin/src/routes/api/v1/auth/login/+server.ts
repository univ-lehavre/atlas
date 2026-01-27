import { json, type RequestHandler } from '@sveltejs/kit';

import { login } from '$lib/server/services/authService';
import {
  ensureJsonContentType,
  parseJsonBody,
  validateMagicUrlLogin,
} from '$lib/validators/server/auth';
import { mapErrorToResponse } from '$lib/errors/mapper';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    ensureJsonContentType(request);
    const body = await parseJsonBody(request);
    const { userId: unsecuredUserId, secret: unsecuredSecret } = body;
    const { userId, secret } = validateMagicUrlLogin(unsecuredUserId, unsecuredSecret);

    // Create session (server-side cookie set in service)
    await login(userId, secret, cookies);

    return json({ data: { loggedIn: true }, error: null }, { status: 200 });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
