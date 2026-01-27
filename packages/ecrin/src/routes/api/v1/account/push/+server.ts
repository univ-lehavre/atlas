import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/appwrite/server';
import { REDCAP_API_TOKEN } from '$env/static/private';
import { pushAccountToRedcap } from '$lib/server/services/accountService';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
  try {
    const { id, email } = await getSession(cookies);
    const user = [{ id, mail: email, active: '1', contact_complete: 1 }];
    const result = await pushAccountToRedcap(REDCAP_API_TOKEN, user, fetch);
    if (result.count !== 1) {
      return json(
        {
          data: null,
          error: {
            code: 'redcap_error',
            message: `Unexpected response: ${JSON.stringify(result)}`,
          },
        },
        { status: 502 }
      );
    }
    return json({ data: result, error: null });
  } catch {
    return json(
      { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
};
