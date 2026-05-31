import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { REDCAP_API_TOKEN, REDCAP_URL } from '$env/static/private';
import { getSurveyUrl } from '$lib/server/services/surveysService';

export const GET: RequestHandler = withHandler(async ({ locals }) => {
  const id = locals.userId;
  if (!id) throw new ApplicationError('unauthenticated', 401, 'No authenticated user');

  const result = await getSurveyUrl(REDCAP_API_TOKEN, REDCAP_URL, id);

  if (result.includes('"error":'))
    throw new ApplicationError('invalid_url', 422, 'Invalid or missing URL');

  return { data: { url: result }, error: null };
});
