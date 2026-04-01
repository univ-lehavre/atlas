import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Load function for the dashboard page.
 * Redirects to login if user is not authenticated.
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.userId) {
    redirect(302, '/login');
  }

  return {};
};
