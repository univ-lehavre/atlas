import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createRateLimiter, rateLimitHeaders } from '@univ-lehavre/atlas-auth';
import { fetchGraphForRecord } from '$lib/server/services/graphsService';

// Public endpoint: requires `record` query param, no auth.
// Rate-limit par-IP pour atténuer l'énumération brute de `record_id`
// (Phase 6.5 DevSecOps — endpoint flagué dans docs/security/surfaces.md).
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  const rate = limiter.check(getClientAddress());
  if (!rate.ok) {
    return json(
      {
        data: null,
        error: { code: 'rate_limited', message: 'Trop de requêtes, réessayez plus tard.' },
      },
      { status: 429, headers: rateLimitHeaders(rate, limiter.limit) }
    );
  }

  try {
    const id = url.searchParams.get('record');
    if (!id)
      return json(
        { data: null, error: { code: 'missing_parameter', message: 'Missing record parameter' } },
        { status: 400, headers: rateLimitHeaders(rate, limiter.limit) }
      );
    const graph = await fetchGraphForRecord(id);
    return json(
      { data: { graph }, error: null },
      { headers: rateLimitHeaders(rate, limiter.limit) }
    );
  } catch {
    return json(
      { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
      { status: 500, headers: rateLimitHeaders(rate, limiter.limit) }
    );
  }
};
