import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runEffectHandler } from '@univ-lehavre/atlas-sveltekit-handler/effect';
import { getWorksCount } from '$lib/server/citation';
import { mapCitationError, serverRuntime } from '$lib/server/runtime';

/** Maximum number of institutions allowed in a single request */
const MAX_INSTITUTIONS = 10;

/**
 * GET /api/v1/works/counts
 * Returns the count of articles published by the specified institutions in the last 5 years.
 */
export const GET: RequestHandler = ({ url, locals }) => {
  if (!locals.userId) {
    return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
  }

  const institutionsParam = url.searchParams.get('institutions');
  if (!institutionsParam) {
    return json(
      { code: 'missing_parameter', message: 'institutions parameter is required' },
      { status: 400 }
    );
  }

  const institutionIds = institutionsParam.split(',').filter(Boolean);
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

  return runEffectHandler(getWorksCount(institutionIds), {
    runtime: serverRuntime,
    mapError: mapCitationError,
  });
};
