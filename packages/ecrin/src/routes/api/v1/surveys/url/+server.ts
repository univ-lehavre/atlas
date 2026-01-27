import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { REDCAP_API_TOKEN, REDCAP_URL } from '$env/static/private';
import { getSurveyUrl } from '$lib/server/services/surveysService';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const id = locals.userId;
    if (!id)
      return json(
        { data: null, error: { code: 'unauthenticated', message: 'No authenticated user' } },
        { status: 401 }
      );

    const result = await getSurveyUrl(REDCAP_API_TOKEN, REDCAP_URL, id);

    if (result.match(/"error":/))
      return json(
        { data: null, error: { code: 'invalid_url', message: 'Invalid or missing URL' } },
        { status: 422 }
      );

    return json({ data: { url: result }, error: null });
  } catch (error) {
    console.error('Error fetching survey URL:', error);
    return json(
      { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
};
