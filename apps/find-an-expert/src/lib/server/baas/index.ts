import type { Cookies } from '@sveltejs/kit';

import {
  createAdminClient as createAdminClientShared,
  createSessionClient as createSessionClientShared,
  type AdminClient,
  type BaasConfig,
  type SessionAccount,
} from '@univ-lehavre/atlas-baas';
import { appwriteEndpoint, appwriteKey, appwriteProject } from '$lib/server/env';

// Configurations dérivées de l'env de l'app, masquées derrière des
// wrappers à signature simple (sans config) pour ne pas obliger les
// consumers (hooks.server.ts, services) à passer la config.
//
// Construites à l'APPEL (et non à l'import) : les secrets sont lus au runtime
// via les getters de `$lib/server/env` (late-binding 12-factor, ADR 0045). Une
// config top-level figerait — voire ferait planter — l'import du module.
const sessionConfig = (): Omit<BaasConfig, 'apiKey'> => ({
  endpoint: appwriteEndpoint(),
  projectId: appwriteProject(),
});

export const adminConfig = (): BaasConfig => ({
  ...sessionConfig(),
  apiKey: appwriteKey(),
});

export const createAdminClient = (): AdminClient => createAdminClientShared(adminConfig());

export const createSessionClient = (cookies: Cookies): SessionAccount =>
  createSessionClientShared(sessionConfig(), cookies);
