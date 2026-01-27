import { json, type RequestHandler } from '@sveltejs/kit';

import { mapErrorToResponse } from '$lib/server/http';
import {
  login,
  ensureJsonContentType,
  parseJsonBody,
  validateMagicUrlLogin,
} from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    ensureJsonContentType(request);
    const body = await parseJsonBody(request);
    const { userId: unsecuredUserId, secret: unsecuredSecret } = body;
    const { userId, secret } = validateMagicUrlLogin(unsecuredUserId, unsecuredSecret);

    await login(userId, secret, cookies);

    return json({ loggedIn: true });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
