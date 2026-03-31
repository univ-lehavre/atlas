import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapErrorToResponse } from '$lib/errors/mapper';
import { newRequest } from '$lib/server/services/surveys';
import type { SurveyListResponse } from '$lib/types/api/surveys';
import { allowed_request_creation } from '$lib/validators/surveys';

export const POST: RequestHandler = async ({ locals, fetch }) => {
  try {
    const userId = locals.userId;
    if (!userId)
      return json(
        { data: null, error: { code: 'unauthenticated', message: 'No authenticated user' } },
        { status: 401 }
      );
    const user = await fetch(`/api/v1/me`).then((res) => res.json());
    const requests = (await fetch(`/api/v1/surveys/list`).then((res) =>
      res.json()
    )) as SurveyListResponse;

    if (requests && requests.data && allowed_request_creation(requests.data) === false)
      return json(
        {
          data: null,
          error: { code: 'conflict', message: 'There are incomplete survey requests' },
        },
        { status: 409 }
      );

    const result = await newRequest(user.data, { fetch });
    return json({ data: { newRequestCreated: result.count }, error: null }, { status: 200 });
  } catch (error) {
    return mapErrorToResponse(error);
  }
};
