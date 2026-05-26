import type { Cookies } from '@sveltejs/kit';

import {
  createSessionClient as createSessionClientShared,
  type BaasConfig,
  type SessionAccount,
} from '@univ-lehavre/atlas-baas';
import { PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT } from '$env/static/public';

// Wrapper à signature simple (sans config) pour ne pas obliger les
// consumers (hooks.server.ts, services) à passer la config — celle-ci
// est dérivée de l'env de l'app et reste interne au module. Le client
// admin (`adminConfig` + `BaasUserRepository`) sera ajouté en phase 6
// quand sillage devra lire/écrire des données chercheur côté Appwrite.
const sessionConfig: Omit<BaasConfig, 'apiKey'> = {
  endpoint: PUBLIC_APPWRITE_ENDPOINT,
  projectId: PUBLIC_APPWRITE_PROJECT,
};

export const createSessionClient = (cookies: Cookies): SessionAccount =>
  createSessionClientShared(sessionConfig, cookies);
