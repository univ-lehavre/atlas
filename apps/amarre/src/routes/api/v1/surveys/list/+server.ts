import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { listRequests } from '$lib/server/services/surveys';
import { z } from '$lib/types/api/zod-openapi';
import { ApiError, makeResponseSchema } from '$lib/types/api/common';
import { surveyListResponse } from '$lib/types/api/surveys';

/**
 * Métadonnées OpenAPI locales (référence des schémas Zod).
 * Note SvelteKit: les exports arbitraires sont interdits, d'où le préfixe `_`.
 */
export const _openapi = {
  method: 'get',
  path: '/api/v1/surveys/list',
  tags: ['surveys'],
  summary: 'Liste les demandes de l’utilisateur (auth requis)',
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: surveyListResponse } } },
    401: {
      description: 'Non authentifié',
      content: { 'application/json': { schema: surveyListResponse } },
    },
    default: {
      description: 'Erreur',
      content: { 'application/json': { schema: makeResponseSchema(z.unknown()) } },
    },
  },
  components: { schemas: { ApiError } },
} as const;

export const GET: RequestHandler = withHandler(async ({ locals, fetch }) => {
  const userId = locals.userId;
  if (!userId) throw new ApplicationError('unauthenticated', 401, 'No authenticated user');

  const safeGetInstrumentLink = async (
    recordId: string,
    instrument: string
  ): Promise<string | undefined> => {
    try {
      const res = await fetch(`/api/v1/surveys/links?record=${recordId}&instrument=${instrument}`);
      if (!res.ok) return undefined;

      const body = (await res.json()) as { data?: { url?: string } | null };
      return body?.data?.url;
    } catch {
      return undefined;
    }
  };

  const requests = await listRequests(userId, { fetch });
  const requestsWithLinks = await Promise.all(
    requests.map(async (request) => {
      const [form, validation_finale] = await Promise.all([
        safeGetInstrumentLink(request.record_id, 'form'),
        safeGetInstrumentLink(request.record_id, 'validation_finale'),
      ]);
      const result = { ...request, form, validation_finale };
      return result;
    })
  );
  const result = requestsWithLinks.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { data: result, error: null };
});
