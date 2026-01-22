// @ts-nocheck
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { checkAuthorization } from '$lib/server/opa';
import { logAuthzDecision } from '$lib/server/audit';
import { getRecords } from '$lib/server/api';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  // Check authorization with OPA
  const allowed = await checkAuthorization({
    user: { email: locals.user.email, groups: locals.user.groups },
    action: 'read',
    resource: { type: 'record' },
  });

  logAuthzDecision(locals.user.email, 'read', '/records', allowed);

  if (!allowed) {
    throw error(403, 'Access denied by policy');
  }

  try {
    const records = await getRecords();
    return {
      user: locals.user,
      records,
    };
  } catch (error_) {
    console.error('Failed to fetch records:', error_);
    return {
      user: locals.user,
      records: [],
      error: 'Unable to fetch records',
    };
  }
};
