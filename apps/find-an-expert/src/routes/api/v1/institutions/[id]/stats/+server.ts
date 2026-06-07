import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runEffectHandler } from '@univ-lehavre/atlas-sveltekit-handler/effect';
import { getInstitutionStats } from '$lib/server/citation';
import { mapCitationError, serverRuntime } from '$lib/server/runtime';

/**
 * GET /api/v1/institutions/:id/stats
 * Returns comprehensive statistics for a single institution over the last 5 years.
 */
export const GET: RequestHandler = ({ params, locals }) => {
  if (!locals.userId) {
    return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
  }

  const institutionId = params.id;
  if (!institutionId) {
    return json(
      { code: 'missing_parameter', message: 'Institution ID is required' },
      { status: 400 }
    );
  }

  return runEffectHandler(getInstitutionStats([institutionId]), {
    runtime: serverRuntime,
    mapError: mapCitationError,
  });
};
