import type { Models } from 'node-appwrite';
import { json, type RequestHandler } from '@sveltejs/kit';

import { mapErrorToResponse } from '$lib/server/http';
import { signupWithEmail, checkRequestBody } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await checkRequestBody(request, ['email']);
    const token: Models.Token = await signupWithEmail(body.email);

    return json({ signedUp: true, createdAt: token.$createdAt });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
