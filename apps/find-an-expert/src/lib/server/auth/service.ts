import type { Cookies } from '@sveltejs/kit';
import type { Models } from 'node-appwrite';

import { createAuthService } from '@univ-lehavre/atlas-auth';
import {
  allowedDomainsRegexp,
  appwriteEndpoint,
  appwriteKey,
  appwriteProject,
} from '$lib/server/env';
import { PUBLIC_LOGIN_URL } from '$env/static/public';

// find-an-expert n'a pas de résolution d'ID externe : `ID.unique()` est
// généré par le factory `createAuthService` (cf. packages/auth/src/index.ts).
//
// Construit à l'APPEL (et non à l'import) : les secrets sont lus au runtime via
// les getters de `$lib/server/env` (late-binding 12-factor, ADR 0045). Mémoïsé
// pour ne créer qu'un service par process. `PUBLIC_LOGIN_URL` reste public
// (build-time, hors périmètre #324).
type AuthService = ReturnType<typeof createAuthService>;
let serviceInstance: AuthService | undefined;
const service = (): AuthService =>
  (serviceInstance ??= createAuthService({
    baas: {
      endpoint: appwriteEndpoint(),
      projectId: appwriteProject(),
      apiKey: appwriteKey(),
    },
    loginUrl: PUBLIC_LOGIN_URL,
    domainValidation: { allowedDomainsRegexp: allowedDomainsRegexp() },
  }));

export const signupWithEmail = (unsecuredEmail: unknown): Promise<Models.Token> =>
  service().signupWithEmail(unsecuredEmail);

export const login = (
  unsecuredUserId: unknown,
  unsecuredSecret: unknown,
  cookies: Cookies
): Promise<Models.Session> => service().login(unsecuredUserId, unsecuredSecret, cookies);

export const logout = (unsecuredUserId: unknown, cookies: Cookies): Promise<void> =>
  service().logout(unsecuredUserId, cookies);
