import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { checkAuthorization } from '$lib/server/opa';
import { logAuthzDecision } from '$lib/server/audit';
import { checkHealth } from '$lib/server/api';

export const load: PageServerLoad = async ({ locals }) => {
  // This route requires authentication (enforced by Authelia)
  // But we double-check here for defense in depth
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  // Check authorization with OPA
  const allowed = await checkAuthorization({
    user: { email: locals.user.email, groups: locals.user.groups },
    action: 'read',
    resource: { type: 'dashboard' },
  });

  logAuthzDecision(locals.user.email, 'read', '/dashboard', allowed);

  if (!allowed) {
    throw error(403, 'Access denied by policy');
  }

  // Check redcap-service health
  let serviceStatus = 'unknown';
  try {
    const health = await checkHealth();
    serviceStatus = health.status;
  } catch {
    serviceStatus = 'unavailable';
  }

  return {
    user: locals.user,
    serviceStatus,
  };
};
