import type { Cookies } from '@sveltejs/kit';
import type { Models } from 'node-appwrite';

import { createAuthService } from '@univ-lehavre/atlas-auth';
import { allowedDomainsRegexp, appwriteKey } from '$lib/server/env';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT,
  PUBLIC_LOGIN_URL,
} from '$env/static/public';

// Configuration partagée pour les flux signup/login/logout. La phase 6
// brachera REDCap via `resolveUserId` pour mapper l'email entrant sur
// un userId stable côté CRF — pour l'instant, l'auth-service utilise
// son fallback (genère un ID).
//
// Service construit à l'APPEL (et non à l'import) : les secrets sont lus au
// runtime via les getters de `$lib/server/env` (late-binding 12-factor,
// ADR 0045). Mémoïsé pour ne créer qu'un service par process. Les `PUBLIC_*`
// restent build-time (hors périmètre #324).
type AuthService = ReturnType<typeof createAuthService>;
let serviceInstance: AuthService | undefined;
const sharedService = (): AuthService =>
  (serviceInstance ??= createAuthService({
    baas: {
      endpoint: PUBLIC_APPWRITE_ENDPOINT,
      projectId: PUBLIC_APPWRITE_PROJECT,
      apiKey: appwriteKey(),
    },
    loginUrl: PUBLIC_LOGIN_URL,
    domainValidation: { allowedDomainsRegexp: allowedDomainsRegexp() },
  }));

export const signupWithEmail = (unsecuredEmail: unknown): Promise<Models.Token> =>
  sharedService().signupWithEmail(unsecuredEmail);

export const login = (
  unsecuredUserId: unknown,
  unsecuredSecret: unknown,
  cookies: Cookies
): Promise<Models.Session> => sharedService().login(unsecuredUserId, unsecuredSecret, cookies);

export const logout = (unsecuredUserId: unknown, cookies: Cookies): Promise<void> =>
  sharedService().logout(unsecuredUserId, cookies);
