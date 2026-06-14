import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/baas/server';
import { redcapApiToken } from '$lib/server/env';
import { checkAccountPushed } from '$lib/server/services/accountService';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
  try {
    const { id, email } = await getSession(cookies);
    const result = await checkAccountPushed(redcapApiToken(), id, email, fetch);
    return json({ data: result, error: null });
  } catch {
    return json(
      { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
};
