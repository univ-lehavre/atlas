import { error } from '@sveltejs/kit';
import { getProfile, isAdmin } from '$lib/server/user';
import type { PageServerLoad } from './$types';

/**
 * Load function that restricts access to admin users only.
 * Returns 404 for non-admin users.
 */
export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.userId;

  if (!userId) {
    error(404, 'Not found');
  }

  const user = await getProfile(userId);

  if (!isAdmin(user)) {
    error(404, 'Not found');
  }

  return {};
};
