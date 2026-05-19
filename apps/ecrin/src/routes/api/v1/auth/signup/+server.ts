import { json, type RequestHandler } from '@sveltejs/kit';
import { createRateLimiter, rateLimitHeaders } from '@univ-lehavre/atlas-auth';

import { signupWithEmail } from '$lib/server/services/authService';
import { validateSignupEmail } from '$lib/validators/server/auth';
import { mapErrorToResponse } from '$lib/errors/mapper';

// Rate-limit anti-spam/brute-force par-IP : signup déclenche un email
// vers l'adresse soumise (Phase 6.5 DevSecOps).
const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

export const POST: RequestHandler = async ({ request, fetch, cookies, getClientAddress }) => {
  const rate = limiter.check(getClientAddress());
  if (!rate.ok) {
    return json(
      {
        data: null,
        error: { code: 'rate_limited', message: 'Trop de tentatives, réessayez plus tard.' },
      },
      { status: 429, headers: rateLimitHeaders(rate, limiter.limit) }
    );
  }

  try {
    // Parse form data
    const form = await request.formData();
    const unsecuredEmail = String(form.get('email') || '').trim();
    const email = await validateSignupEmail(unsecuredEmail);

    // Perform signup
    await signupWithEmail(email, { fetch, cookies });

    return json(
      { data: { signedUp: true }, error: null },
      { status: 200, headers: rateLimitHeaders(rate, limiter.limit) }
    );
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
