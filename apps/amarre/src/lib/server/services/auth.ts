import type { Cookies } from '@sveltejs/kit';
import type { Models } from 'node-appwrite';

import { createAuthService } from '@univ-lehavre/atlas-auth';
import { allowedDomainsRegexp, appwriteKey } from '$lib/server/env';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT,
  PUBLIC_LOGIN_URL,
} from '$env/static/public';
import { fetchUserId } from './surveys';
import type { Fetch } from '$lib/types';

// Configuration partagée pour les flux login/logout (pas besoin du fetch
// SvelteKit). Le signup utilise une instance dédiée par requête pour
// brancher la résolution d'ID via REDCap (`fetchUserId`).
//
// `baseConfig` est une FONCTION (et non une const) : la clé Appwrite et la regex
// sont des secrets lus au runtime via `$lib/server/env` (late-binding 12-factor,
// ADR 0045). Une const top-level lirait les secrets à l'import du module. Les
// `PUBLIC_*` restent build-time (hors périmètre #324).
const baseConfig = () =>
  ({
    baas: {
      endpoint: PUBLIC_APPWRITE_ENDPOINT,
      projectId: PUBLIC_APPWRITE_PROJECT,
      apiKey: appwriteKey(),
    },
    loginUrl: PUBLIC_LOGIN_URL,
    domainValidation: { allowedDomainsRegexp: allowedDomainsRegexp() },
  }) as const;

// Service login/logout construit à l'APPEL et mémoïsé (un par process).
type AuthService = ReturnType<typeof createAuthService>;
let serviceInstance: AuthService | undefined;
const sharedService = (): AuthService => (serviceInstance ??= createAuthService(baseConfig()));

export const signupWithEmail = async (
  unsecuredEmail: unknown,
  { fetch }: { fetch: Fetch }
): Promise<Models.Token> => {
  const service = createAuthService({
    ...baseConfig(),
    resolveUserId: async (email) => {
      try {
        const id = await fetchUserId(email, { fetch });
        return id ?? undefined;
      } catch (error) {
        console.error('Failed to fetch user ID from REDCap in signupWithEmail:', error);
        return;
      }
    },
  });
  return service.signupWithEmail(unsecuredEmail);
};

export const login = (
  unsecuredUserId: unknown,
  unsecuredSecret: unknown,
  cookies: Cookies
): Promise<Models.Session> => sharedService().login(unsecuredUserId, unsecuredSecret, cookies);

export const logout = (unsecuredUserId: unknown, cookies: Cookies): Promise<void> =>
  sharedService().logout(unsecuredUserId, cookies);
