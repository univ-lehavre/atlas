import type { Cookies } from '@sveltejs/kit';
import type { Models } from 'node-appwrite';

import { createAuthService } from '@univ-lehavre/atlas-auth';
import { ALLOWED_DOMAINS_REGEXP, APPWRITE_KEY } from '$env/static/private';
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
  { fetch }: { fetch: Fetch }
): Promise<Models.Token> => {
  const service = createAuthService({
    ...baseConfig,
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
): Promise<Models.Session> => sharedService.login(unsecuredUserId, unsecuredSecret, cookies);

export const logout = (unsecuredUserId: unknown, cookies: Cookies): Promise<void> =>
  sharedService.logout(unsecuredUserId, cookies);
