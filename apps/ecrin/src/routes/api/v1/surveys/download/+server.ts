import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { redcapApiToken, redcapUrl } from '$lib/server/env';
import { downloadSurvey } from '$lib/server/services/surveysService';

export const GET: RequestHandler = withHandler(async ({ locals }) => {
  const id = locals.userId;
  if (!id) throw new ApplicationError('unauthenticated', 401, 'No authenticated user');
  const result = await downloadSurvey(redcapApiToken(), redcapUrl(), id);
  return { data: result, error: null };
});
