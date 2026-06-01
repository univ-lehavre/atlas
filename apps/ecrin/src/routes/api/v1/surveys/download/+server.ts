import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { REDCAP_API_TOKEN, REDCAP_URL } from '$env/static/private';
import { downloadSurvey } from '$lib/server/services/surveysService';

export const GET: RequestHandler = withHandler(async ({ locals }) => {
  const id = locals.userId;
  if (!id) throw new ApplicationError('unauthenticated', 401, 'No authenticated user');
  const result = await downloadSurvey(REDCAP_API_TOKEN, REDCAP_URL, id);
  return { data: result, error: null };
});
