import type { Cookies } from '@sveltejs/kit';
import type { Models } from 'node-appwrite';

import { createAuthService } from '@univ-lehavre/atlas-auth';
import {
  ALLOWED_DOMAINS_REGEXP,
  APPWRITE_ENDPOINT,
  APPWRITE_KEY,
  APPWRITE_PROJECT,
} from '$env/static/private';
import { PUBLIC_LOGIN_URL } from '$env/static/public';

// find-an-expert n'a pas de résolution d'ID externe : `ID.unique()` est
// généré par le factory `createAuthService` (cf. packages/auth/src/index.ts).
const service = createAuthService({
  baas: {
    endpoint: APPWRITE_ENDPOINT,
    projectId: APPWRITE_PROJECT,
    apiKey: APPWRITE_KEY,
  },
  loginUrl: PUBLIC_LOGIN_URL,
  domainValidation: { allowedDomainsRegexp: ALLOWED_DOMAINS_REGEXP },
});

export const signupWithEmail = (unsecuredEmail: unknown): Promise<Models.Token> =>
  service.signupWithEmail(unsecuredEmail);

export const login = (
  unsecuredUserId: unknown,
  unsecuredSecret: unknown,
  cookies: Cookies
): Promise<Models.Session> => service.login(unsecuredUserId, unsecuredSecret, cookies);

export const logout = (unsecuredUserId: unknown, cookies: Cookies): Promise<void> =>
  service.logout(unsecuredUserId, cookies);
