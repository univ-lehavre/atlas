import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { downloadSurvey } from '$lib/server/services/surveys';

export const GET: RequestHandler = withHandler(async ({ locals, fetch }) => {
  const id = locals.userId;
  if (!id) throw new ApplicationError('unauthenticated', 401, 'No authenticated user');
  const result = await downloadSurvey(id, { fetch });
  return { data: result, error: null };
});
