import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getInstitutionStats } from '$lib/server/openalex';
import { hasConsent } from '$lib/server/consent';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * GET /api/v1/institutions/:id/stats
 * Returns comprehensive statistics for a single institution over the last 5 years.
 * Includes works count (all types), articles count, and authors count.
 *
 * Requires authentication and consent to use the OpenAlex polite pool.
 *
 * Path parameters:
 * - id: OpenAlex institution ID
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    // Require authentication
    if (!locals.userId || !locals.userEmail) {
      return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
    }

    // Verify consent for OpenAlex email usage
    const consentGranted = await hasConsent(locals.userId, 'openalex_email');
    if (!consentGranted) {
      return json(
        {
          code: 'consent_required',
          message: 'Consent required to use OpenAlex API with your email',
        },
        { status: 403 }
      );
    }

    const institutionId = params.id;

    if (!institutionId) {
      return json(
        { code: 'missing_parameter', message: 'Institution ID is required' },
        { status: 400 }
      );
    }

    // Use authenticated user's email for polite pool
    const result = await getInstitutionStats([institutionId], locals.userEmail);
    return json(result);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
