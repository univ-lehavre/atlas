import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { validateMagicUrlLogin } from '$lib/server/validators/auth';

export const load: PageServerLoad = async ({ url, fetch }) => {
  // Extract parameters
  const unsecuredSecret = url.searchParams.get('secret');
  const unsecuredUserId = url.searchParams.get('userId');

  // Checks and validation
  const { userId, secret } = validateMagicUrlLogin(unsecuredUserId, unsecuredSecret);

  // Call login API
  await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, secret }),
  });

  redirect(302, '/');
};
