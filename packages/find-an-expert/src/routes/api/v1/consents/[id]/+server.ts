import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getConsentStatus, grantConsent, revokeConsent, ConsentType } from '$lib/server/consent';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * GET /api/v1/consents/:id
 * Returns the consent status for a specific consent type.
 *
 * Path parameters:
 * - id: The consent type (e.g., "openalex_email")
 *
 * Response:
 * - consentType: The consent type
 * - granted: true if granted, false if revoked, null if never asked
 * - updatedAt: ISO timestamp of last update, null if never asked
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    if (!locals.userId) {
      return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
    }

    const parseResult = ConsentType.safeParse(params.id);
    if (!parseResult.success) {
      return json(
        { code: 'not_found', message: `Consent type '${params.id}' not found` },
        { status: 404 }
      );
    }

    const status = await getConsentStatus(locals.userId, parseResult.data);
    return json(status);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};

/**
 * PUT /api/v1/consents/:id
 * Updates the consent status for a specific consent type.
 *
 * Path parameters:
 * - id: The consent type (e.g., "openalex_email")
 *
 * Body:
 * - granted (required): boolean - true to grant, false to revoke
 *
 * Response:
 * - consentType: The consent type
 * - granted: true if granted, false if revoked
 * - updatedAt: ISO timestamp of the update
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    if (!locals.userId) {
      return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
    }

    const parseResult = ConsentType.safeParse(params.id);
    if (!parseResult.success) {
      return json(
        { code: 'not_found', message: `Consent type '${params.id}' not found` },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (typeof body.granted !== 'boolean') {
      return json(
        { code: 'invalid_parameter', message: 'granted must be a boolean' },
        { status: 400 }
      );
    }

    const status = body.granted
      ? await grantConsent(locals.userId, parseResult.data)
      : await revokeConsent(locals.userId, parseResult.data);

    return json(status);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};

/**
 * DELETE /api/v1/consents/:id
 * Revokes the consent for a specific consent type.
 *
 * Path parameters:
 * - id: The consent type (e.g., "openalex_email")
 *
 * Response:
 * - consentType: The consent type
 * - granted: false
 * - updatedAt: ISO timestamp of the revocation
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    if (!locals.userId) {
      return json({ code: 'unauthenticated', message: 'User not authenticated' }, { status: 401 });
    }

    const parseResult = ConsentType.safeParse(params.id);
    if (!parseResult.success) {
      return json(
        { code: 'not_found', message: `Consent type '${params.id}' not found` },
        { status: 404 }
      );
    }

    const status = await revokeConsent(locals.userId, parseResult.data);
    return json(status);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
