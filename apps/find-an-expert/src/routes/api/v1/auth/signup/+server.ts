import type { Models } from 'node-appwrite';
import { json, type RequestHandler } from '@sveltejs/kit';
import { createRateLimiter, rateLimitHeaders } from '@univ-lehavre/atlas-auth';

import { mapErrorToResponse } from '$lib/server/http';
import { signupWithEmail, checkRequestBody } from '$lib/server/auth';

// Rate-limit anti-spam/brute-force par-IP : signup déclenche un email
// vers l'adresse soumise (Phase 6.5 DevSecOps).
const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const rate = limiter.check(getClientAddress());
  if (!rate.ok) {
    return json(
      { code: 'rate_limited', message: 'Trop de tentatives, réessayez plus tard.' },
      { status: 429, headers: rateLimitHeaders(rate, limiter.limit) }
    );
  }

  try {
    const body = await checkRequestBody(request, ['email']);
    const token: Models.Token = await signupWithEmail(body.email);

    return json(
      { signedUp: true, createdAt: token.$createdAt },
      { headers: rateLimitHeaders(rate, limiter.limit) }
    );
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
