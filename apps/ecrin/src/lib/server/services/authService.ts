import type { Cookies } from '@sveltejs/kit';
import type { Models } from 'node-appwrite';

import { createAuthService } from '@univ-lehavre/atlas-auth';
import { appwriteKey } from '$lib/server/env';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT,
  PUBLIC_LOGIN_URL,
} from '$env/static/public';
import type { SignupContext } from '$lib/types/auth';
import { fetchUserId } from '$lib/server/services/userService';

// L'allowlist de domaines n'est pas exposée en `$env/dynamic/private` ici,
// mais validée côté `validateSignupEmail` du package via la regex passée
// en config. Une chaîne vide désactive la contrainte côté factory.
const ALLOWED_DOMAINS_REGEXP = '';

// `baseConfig` est une FONCTION (et non une const) : la clé Appwrite est un
// secret lu au runtime via `$lib/server/env` (late-binding 12-factor, ADR 0045).
// Une const top-level lirait le secret à l'import. Les `PUBLIC_*` restent
// build-time (hors périmètre #324).
const baseConfig = () =>
  ({
    baas: {
      endpoint: PUBLIC_APPWRITE_ENDPOINT,
      projectId: PUBLIC_APPWRITE_PROJECT,
      apiKey: appwriteKey(),
    },
    loginUrl: PUBLIC_LOGIN_URL,
    domainValidation: { allowedDomainsRegexp: ALLOWED_DOMAINS_REGEXP },
  }) as const;

// Service login/logout/delete construit à l'APPEL et mémoïsé (un par process).
type AuthService = ReturnType<typeof createAuthService>;
let serviceInstance: AuthService | undefined;
const sharedService = (): AuthService => (serviceInstance ??= createAuthService(baseConfig()));

export const signupWithEmail = async (
  unsecuredEmail: unknown,
  ctx: SignupContext
): Promise<Models.Token> => {
  const service = createAuthService({
    ...baseConfig(),
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
): Promise<Models.Session> => sharedService().login(unsecuredUserId, unsecuredSecret, cookies);

export const logout = (unsecuredUserId: unknown, cookies: Cookies): Promise<void> =>
  sharedService().logout(unsecuredUserId, cookies);

export const deleteUser = (unsecuredUserId: string, cookies: Cookies): Promise<void> =>
  sharedService().deleteUser(unsecuredUserId, cookies);
