import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runEffectHandler } from '@univ-lehavre/atlas-sveltekit-handler/effect';
import { getInstitutionStats } from '$lib/server/citation';
import { mapCitationError, serverRuntime } from '$lib/server/runtime';

/** Maximum number of institutions allowed in a single request */
const MAX_INSTITUTIONS = 10;

/**
 * GET /api/v1/institutions/stats
 * Returns comprehensive statistics for the specified institutions over the last 5 years.
 */
export const GET: RequestHandler = ({ url, locals }) => {
  if (!locals.userId) {
    return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
  }

  const idsParam = url.searchParams.get('ids');
  if (!idsParam) {
    return json(
      { code: 'missing_parameter', message: 'ids parameter is required' },
      { status: 400 }
    );
  }

  const institutionIds = idsParam.split(',').filter(Boolean);
  if (institutionIds.length === 0) {
    return json(
      { code: 'invalid_parameter', message: 'At least one institution ID is required' },
      { status: 400 }
    );
  }
  if (institutionIds.length > MAX_INSTITUTIONS) {
    return json(
      {
        code: 'too_many_institutions',
        message: `Maximum ${MAX_INSTITUTIONS} institutions allowed`,
      },
      { status: 400 }
    );
  }

  return runEffectHandler(getInstitutionStats(institutionIds), {
    runtime: serverRuntime,
    mapError: mapCitationError,
  });
};
