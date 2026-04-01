import { json, type RequestHandler } from '@sveltejs/kit';

import { signupWithEmail } from '$lib/server/services/authService';
import { validateSignupEmail } from '$lib/validators/server/auth';
import { mapErrorToResponse } from '$lib/errors/mapper';

export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
  try {
    // Parse form data
    const form = await request.formData();
    const unsecuredEmail = String(form.get('email') || '').trim();
    const email = await validateSignupEmail(unsecuredEmail);

    // Perform signup
    await signupWithEmail(email, { fetch, cookies });

    return json({ data: { signedUp: true }, error: null }, { status: 200 });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
