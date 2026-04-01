import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { REDCAP_API_TOKEN, REDCAP_URL } from '$env/static/private';
import { downloadSurvey } from '$lib/server/services/surveysService';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const id = locals.userId;
    if (!id)
      return json(
        { data: null, error: { code: 'unauthenticated', message: 'No authenticated user' } },
        { status: 401 }
      );
    const result = await downloadSurvey(REDCAP_API_TOKEN, REDCAP_URL, id);
    return json({ data: result, error: null });
  } catch {
    return json(
      { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
};
