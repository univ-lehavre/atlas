import type { Cookies } from '@sveltejs/kit';
import { ID, type Models } from 'node-appwrite';

import {
  createAdminClient,
  createSessionClient,
  SESSION_COOKIE,
  type AppwriteConfig,
} from '@univ-lehavre/atlas-appwrite';
import { validateMagicUrlLogin, validateSignupEmail, validateUserId } from './validators.js';
import type { DomainValidationConfig } from './validators.js';

// Re-export for convenience
export { SESSION_COOKIE } from '@univ-lehavre/atlas-appwrite';
export {
  validateMagicUrlLogin,
  validateSignupEmail,
  validateUserId,
  checkRequestBody,
  type DomainValidationConfig,
} from './validators.js';

/**
 * Configuration for the auth service.
 */
export interface AuthConfig {
  /** Appwrite configuration */
  appwrite: AppwriteConfig;
  /** Login redirect URL (e.g., 'https://app.example.com') */
  loginUrl: string;
  /** Domain validation configuration */
  domainValidation: DomainValidationConfig;
  /**
   * Optional callback to resolve user ID from email.
   * Useful for integrating with external systems like REDCap.
   * If returns undefined, a unique ID will be generated.
   */
  resolveUserId?: (email: string) => Promise<string | undefined>;
}

/**
 * Creates an auth service instance with the given configuration.
 *
 * @param config - Auth service configuration
 * @returns Auth service with signup, login, logout, and deleteUser methods
 *
 * @example
 * ```typescript
 * const authService = createAuthService({
 *   appwrite: {
 *     endpoint: APPWRITE_ENDPOINT,
 *     projectId: APPWRITE_PROJECT,
 *     apiKey: APPWRITE_KEY,
 *   },
 *   loginUrl: PUBLIC_LOGIN_URL,
 *   domainValidation: {
 *     allowedDomainsRegexp: ALLOWED_DOMAINS_REGEXP,
 *   },
 * });
 *
 * // In your API route:
 * const token = await authService.signupWithEmail(body.email);
 * ```
 */
export const createAuthService = (config: AuthConfig): AuthService => {
  /**
   * Signs up a user with email and sends a magic link for authentication.
   *
   * @param unsecuredEmail - The email address to validate and use for signup
   * @returns A promise resolving to the magic URL token
   */
  const signupWithEmail = async (unsecuredEmail: unknown): Promise<Models.Token> => {
    const email = await validateSignupEmail(unsecuredEmail, config.domainValidation);
    const url = `${config.loginUrl}/login`;

    // Resolve user ID (from external system or generate new)
    let userId: string;
    if (config.resolveUserId) {
      const resolvedId = await config.resolveUserId(email);
      userId = resolvedId ?? ID.unique();
    } else {
      userId = ID.unique();
    }

    const { account } = createAdminClient(config.appwrite);
    const token = await account.createMagicURLToken(userId, email, url);

    return token;
  };

  /**
   * Logs in a user using magic URL parameters and creates a session.
   *
   * @param unsecuredUserId - The user ID from the magic URL
   * @param unsecuredSecret - The secret from the magic URL
   * @param cookies - SvelteKit cookies object for setting the session cookie
   * @returns A promise resolving to the created session
   */
  const login = async (
    unsecuredUserId: unknown,
    unsecuredSecret: unknown,
    cookies: Cookies
  ): Promise<Models.Session> => {
    const { userId, secret } = validateMagicUrlLogin(unsecuredUserId, unsecuredSecret);

    const { account } = createAdminClient(config.appwrite);
    const session = await account.createSession(userId, secret);
    cookies.set(SESSION_COOKIE, session.secret, {
      sameSite: 'strict',
      expires: new Date(session.expire),
      secure: true,
      path: '/',
    });

    return session;
  };

  /**
   * Logs out a user by deleting all their sessions and clearing the session cookie.
   *
   * @param unsecuredUserId - The user ID to validate
   * @param cookies - SvelteKit cookies object for deleting the session cookie
   */
  const logout = async (unsecuredUserId: unknown, cookies: Cookies): Promise<void> => {
    validateUserId(unsecuredUserId);

    const { account } = createSessionClient(config.appwrite, cookies);
    await account.deleteSessions();
    cookies.delete(SESSION_COOKIE, { path: '/' });
  };

  /**
   * Deletes a user account after logging them out.
   *
   * @param unsecuredUserId - The user ID to validate and delete
   * @param cookies - SvelteKit cookies object for deleting the session cookie
   */
  const deleteUser = async (unsecuredUserId: unknown, cookies: Cookies): Promise<void> => {
    const userId = validateUserId(unsecuredUserId);
    await logout(userId, cookies);
    const { users } = createAdminClient(config.appwrite);
    await users.delete(userId);
  };

  return {
    signupWithEmail,
    login,
    logout,
    deleteUser,
  };
};

/**
 * Auth service interface.
 */
export interface AuthService {
  signupWithEmail: (unsecuredEmail: unknown) => Promise<Models.Token>;
  login: (
    unsecuredUserId: unknown,
    unsecuredSecret: unknown,
    cookies: Cookies
  ) => Promise<Models.Session>;
  logout: (unsecuredUserId: unknown, cookies: Cookies) => Promise<void>;
  deleteUser: (unsecuredUserId: unknown, cookies: Cookies) => Promise<void>;
}
