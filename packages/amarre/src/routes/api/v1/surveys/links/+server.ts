import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapErrorToResponse } from '$lib/errors/mapper';
import { getSurveyUrl } from '$lib/server/services/surveys';
import { z } from '$lib/types/api/zod-openapi';
import { ApiError, makeResponseSchema } from '$lib/types/api/common';

const surveyLinkResponse = makeResponseSchema(z.object({ url: z.string() }).strict());

/**
 * Métadonnées OpenAPI locales (référence des schémas Zod).
 * Note SvelteKit: les exports arbitraires sont interdits, d'où le préfixe `_`.
 */
export const _openapi = {
  method: 'get',
  path: '/api/v1/surveys/links',
  tags: ['surveys'],
  summary: 'Récupère un lien de questionnaire (auth requis)',
  security: [{ cookieAuth: [] }],
  query: {
    record: { type: 'string', description: 'Record ID' },
    instrument: { type: 'string', description: 'Instrument name' },
  },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: surveyLinkResponse } } },
    400: {
      description: 'Paramètres manquants',
      content: { 'application/json': { schema: surveyLinkResponse } },
    },
    401: {
      description: 'Non authentifié',
      content: { 'application/json': { schema: surveyLinkResponse } },
    },
    422: {
      description: 'Lien invalide',
      content: { 'application/json': { schema: surveyLinkResponse } },
    },
    default: {
      description: 'Erreur',
      content: { 'application/json': { schema: makeResponseSchema(z.unknown()) } },
    },
  },
  components: { schemas: { ApiError } },
} as const;

export const GET: RequestHandler = async ({ locals, fetch, url }) => {
  try {
    const userId = locals.userId;
    if (!userId)
      return json(
        { data: null, error: { code: 'unauthenticated', message: 'No authenticated user' } },
        { status: 401 }
      );

    const record = url.searchParams.get('record');
    const instrument = url.searchParams.get('instrument');
    if (!record || !instrument) {
      return json(
        {
          data: null,
          error: { code: 'bad_request', message: 'Missing record or instrument parameter' },
        },
        { status: 400 }
      );
    }

    const result = await getSurveyUrl(record, instrument, { fetch });

    let hasError = false;
    try {
      const parsed = JSON.parse(result);
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        hasError = true;
      }
    } catch {
      // result is not JSON; treat it as a plain URL string
    }

    if (hasError)
      return json(
        { data: null, error: { code: 'invalid_url', message: 'Invalid or missing URL' } },
        { status: 422 }
      );
    return json({ data: { url: result }, error: null }, { status: 200 });
  } catch (error) {
    return mapErrorToResponse(error);
  }
};
