import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { newRequest } from '$lib/server/services/surveys';
import type { SurveyListResponse } from '$lib/types/api/surveys';
import { allowed_request_creation } from '$lib/validators/surveys';

export const POST: RequestHandler = withHandler(async ({ locals, fetch }) => {
  const userId = locals.userId;
  if (!userId) throw new ApplicationError('unauthenticated', 401, 'No authenticated user');

  const user = await fetch(`/api/v1/me`).then((res) => res.json());
  const requests = (await fetch(`/api/v1/surveys/list`).then((res) =>
    res.json()
  )) as SurveyListResponse;

  if (requests && requests.data && !allowed_request_creation(requests.data))
    throw new ApplicationError('conflict', 409, 'There are incomplete survey requests');

  const result = await newRequest(user.data, { fetch });
  return { data: { newRequestCreated: result.count }, error: null };
});
