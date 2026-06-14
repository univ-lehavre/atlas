import type { Cookies } from '@sveltejs/kit';

import {
  createSessionClient as createSessionClientShared,
  type BaasConfig,
  type SessionAccount,
} from '@univ-lehavre/atlas-baas';
import { appwriteKey } from '$lib/server/env';
import { PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT } from '$env/static/public';

// Configurations dérivées de l'env de l'app, masquées derrière des
// wrappers à signature simple (sans config) pour ne pas obliger les
// consumers (hooks.server.ts) à passer la config. Endpoint/projectId sont
// publics (build-time) ; seule la clé admin est un secret lu au runtime.
const sessionConfig: Omit<BaasConfig, 'apiKey'> = {
  endpoint: PUBLIC_APPWRITE_ENDPOINT,
  projectId: PUBLIC_APPWRITE_PROJECT,
};

// `adminConfig` est exposé pour `BaasUserRepository` (subclass thin) qui
// instancie elle-même son admin client via le package partagé. Construit à
// l'APPEL : la clé admin est lue au runtime via `$lib/server/env` (late-binding
// 12-factor, ADR 0045) — une const top-level lirait le secret à l'import.
export const adminConfig = (): BaasConfig => ({
  ...sessionConfig,
  apiKey: appwriteKey(),
});

export const createSessionClient = (cookies: Cookies): SessionAccount =>
  createSessionClientShared(sessionConfig, cookies);
