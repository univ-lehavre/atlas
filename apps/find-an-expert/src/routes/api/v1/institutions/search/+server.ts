import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createRateLimiter, rateLimitHeaders } from '@univ-lehavre/atlas-auth';
import { runEffectHandler } from '@univ-lehavre/atlas-sveltekit-handler/effect';

import { searchInstitutions } from '$lib/server/citation';
import { mapCitationError, serverRuntime } from '$lib/server/runtime';

/**
 * GET /api/v1/institutions/search
 * Searches for research institutions using the upstream citation API.
 * @param q - Search query string (required)
 *
 * Endpoint public sans gate d'auth — consomme un token API serveur, donc
 * rate-limit par-IP pour éviter l'abus de quota (Phase 6.5 DevSecOps,
 * endpoint flagué dans docs/security/surfaces.md).
 */
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  const rate = limiter.check(getClientAddress());
  if (!rate.ok) {
    return json(
      { code: 'rate_limited', message: 'Trop de requêtes, réessayez plus tard.' },
      { status: 429, headers: rateLimitHeaders(rate, limiter.limit) }
    );
  }

  const query = url.searchParams.get('q') ?? '';
  // The Effect runs on the server runtime; a typed upstream failure maps to its
  // HTTP status (502) instead of an opaque 500 (ADR 0046).
  return runEffectHandler(searchInstitutions(query), {
    runtime: serverRuntime,
    mapError: mapCitationError,
    headers: rateLimitHeaders(rate, limiter.limit),
  });
};
