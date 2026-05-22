import type { Cookies } from '@sveltejs/kit';
import type { Models } from 'node-appwrite';

import { createAuthService } from '@univ-lehavre/atlas-auth';
import { ALLOWED_DOMAINS_REGEXP, APPWRITE_KEY } from '$env/static/private';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT,
  PUBLIC_LOGIN_URL,
} from '$env/static/public';

// Configuration partagée pour les flux signup/login/logout. La phase 6
// brachera REDCap via `resolveUserId` pour mapper l'email entrant sur
// un userId stable côté CRF — pour l'instant, l'auth-service utilise
// son fallback (genère un ID).
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

export const signupWithEmail = (unsecuredEmail: unknown): Promise<Models.Token> =>
  sharedService.signupWithEmail(unsecuredEmail);

export const login = (
  unsecuredUserId: unknown,
  unsecuredSecret: unknown,
  cookies: Cookies
): Promise<Models.Session> => sharedService.login(unsecuredUserId, unsecuredSecret, cookies);

export const logout = (unsecuredUserId: unknown, cookies: Cookies): Promise<void> =>
  sharedService.logout(unsecuredUserId, cookies);
