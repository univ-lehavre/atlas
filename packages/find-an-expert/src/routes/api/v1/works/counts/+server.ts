import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getWorksCount } from '$lib/server/openalex';
import { hasConsent } from '$lib/server/consent';
import { mapErrorToResponse } from '$lib/server/http';

/** Maximum number of institutions allowed in a single request */
const MAX_INSTITUTIONS = 10;

/**
 * GET /api/v1/works/counts
 * Returns the count of articles published by the specified institutions in the last 5 years.
 *
 * Requires authentication and consent to use the OpenAlex polite pool.
 *
 * Query parameters:
 * - institutions (required): Comma-separated OpenAlex institution IDs (max 10)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
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

    // Use authenticated user's email for polite pool
    const result = await getWorksCount(institutionIds, locals.userEmail);
    return json(result);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
