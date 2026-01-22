import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { checkAuthorization } from '$lib/server/opa';
import { logAuthzDecision } from '$lib/server/audit';
import { getUsers } from '$lib/server/api';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  // Only admins can access users management
  const allowed = await checkAuthorization({
    user: { email: locals.user.email, groups: locals.user.groups },
    action: 'read',
    resource: { type: 'user' },
  });

  logAuthzDecision(locals.user.email, 'read', '/users', allowed);

  if (!allowed) {
    throw error(403, 'Access denied - Admin role required');
  }

  try {
    const users = await getUsers();
    return {
      user: locals.user,
      users,
    };
  } catch (error_) {
    console.error('Failed to fetch users:', error_);
    return {
      user: locals.user,
      users: [],
      error: 'Unable to fetch users',
    };
  }
};
