import type { Cookies } from '@sveltejs/kit';

import {
  createAdminClient as createAdminClientShared,
  createSessionClient as createSessionClientShared,
  type AdminClient,
  type BaasConfig,
  type SessionAccount,
} from '@univ-lehavre/atlas-baas';
import { APPWRITE_KEY } from '$env/static/private';
import { PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT } from '$env/static/public';

// Configurations dérivées de l'env de l'app, masquées derrière des
// wrappers à signature simple (sans config) pour ne pas obliger les
// consumers (hooks.server.ts, services) à passer la config.
const sessionConfig: Omit<BaasConfig, 'apiKey'> = {
  endpoint: PUBLIC_APPWRITE_ENDPOINT,
  projectId: PUBLIC_APPWRITE_PROJECT,
};

const adminConfig: BaasConfig = {
  ...sessionConfig,
  apiKey: APPWRITE_KEY,
};

export const createAdminClient = (): AdminClient => createAdminClientShared(adminConfig);

export const createSessionClient = (cookies: Cookies): SessionAccount =>
  createSessionClientShared(sessionConfig, cookies);
