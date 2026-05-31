import type { Cookies } from '@sveltejs/kit';
import type { Models } from 'node-appwrite';

import { createAuthService } from '@univ-lehavre/atlas-auth';
import { APPWRITE_KEY } from '$env/static/private';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT,
  PUBLIC_LOGIN_URL,
} from '$env/static/public';
import type { SignupContext } from '$lib/types/auth';
import { fetchUserId } from '$lib/server/services/userService';

// L'allowlist de domaines n'est pas exposée en `$env/static/private` ici,
// mais validée côté `validateSignupEmail` du package via la regex passée
// en config. Une chaîne vide désactive la contrainte côté factory.
const ALLOWED_DOMAINS_REGEXP = '';

const baseConfig = {
  baas: {
    endpoint: PUBLIC_APPWRITE_ENDPOINT,
    projectId: PUBLIC_APPWRITE_PROJECT,
    apiKey: APPWRITE_KEY,
  },
  loginUrl: PUBLIC_LOGIN_URL,
  domainValidation: { allowedDomainsRegexp: ALLOWED_DOMAINS_REGEXP },
} as const;

const sharedService = createAuthService(baseConfig);

export const signupWithEmail = async (
  unsecuredEmail: unknown,
  ctx: SignupContext
): Promise<Models.Token> => {
  const service = createAuthService({
    ...baseConfig,
    resolveUserId: async (email) => {
      try {
        const id = await fetchUserId(ctx.fetch, email);
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
): Promise<Models.Session> => sharedService.login(unsecuredUserId, unsecuredSecret, cookies);

export const logout = (unsecuredUserId: unknown, cookies: Cookies): Promise<void> =>
  sharedService.logout(unsecuredUserId, cookies);

export const deleteUser = (unsecuredUserId: string, cookies: Cookies): Promise<void> =>
  sharedService.deleteUser(unsecuredUserId, cookies);
