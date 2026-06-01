import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { getConsentStatus, grantConsent, revokeConsent, ConsentType } from '$lib/server/consent';
import { flatErrorMapper } from '$lib/server/http';

/**
 * GET /api/v1/consents/:id
 * Returns the consent status for a specific consent type.
 */
export const GET: RequestHandler = withHandler(
  async ({ params, locals }) => {
    if (!locals.userId)
      throw new ApplicationError('unauthenticated', 401, 'User not authenticated');

    const parseResult = ConsentType.safeParse(params.id);
    if (!parseResult.success)
      throw new ApplicationError('not_found', 404, `Consent type '${params.id}' not found`);

    return getConsentStatus(locals.userId, parseResult.data);
  },
  { mapError: flatErrorMapper }
);

/**
 * PUT /api/v1/consents/:id
 * Updates the consent status for a specific consent type.
 */
export const PUT: RequestHandler = withHandler(
  async ({ params, request, locals }) => {
    if (!locals.userId)
      throw new ApplicationError('unauthenticated', 401, 'User not authenticated');

    const parseResult = ConsentType.safeParse(params.id);
    if (!parseResult.success)
      throw new ApplicationError('not_found', 404, `Consent type '${params.id}' not found`);

    const body = await request.json();

    if (typeof body.granted !== 'boolean')
      throw new ApplicationError('invalid_parameter', 400, 'granted must be a boolean');

    return body.granted
      ? grantConsent(locals.userId, parseResult.data)
      : revokeConsent(locals.userId, parseResult.data);
  },
  { mapError: flatErrorMapper }
);

/**
 * DELETE /api/v1/consents/:id
 * Revokes the consent for a specific consent type.
 */
export const DELETE: RequestHandler = withHandler(
  async ({ params, locals }) => {
    if (!locals.userId)
      throw new ApplicationError('unauthenticated', 401, 'User not authenticated');

    const parseResult = ConsentType.safeParse(params.id);
    if (!parseResult.success)
      throw new ApplicationError('not_found', 404, `Consent type '${params.id}' not found`);

    return revokeConsent(locals.userId, parseResult.data);
  },
  { mapError: flatErrorMapper }
);
