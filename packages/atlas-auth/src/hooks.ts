import type { Cookies } from '@sveltejs/kit';
import { AppwriteException } from 'node-appwrite';

import { SessionError } from '@univ-lehavre/atlas-errors';
import { createSessionClient, type AppwriteConfig } from '@univ-lehavre/atlas-appwrite';

/**
 * User session data extracted from Appwrite.
 */
export interface UserSession {
  /** User ID */
  userId: string;
  /** User email */
  userEmail: string;
}

/**
 * Result of session extraction attempt.
 */
export interface SessionResult {
  /** User session if authenticated, undefined otherwise */
  session?: UserSession;
  /** Connectivity error type if backend is unreachable */
  connectivityError?: 'appwrite_unavailable';
}

/**
 * Checks if an error is an expected authentication error.
 *
 * @param error - The error to check
 * @returns True if the error is expected for unauthenticated users
 */
export const isExpectedAuthError = (error: unknown): boolean => {
  if (error instanceof SessionError) {
    return true;
  }
  if (error instanceof AppwriteException) {
    return error.code === 401;
  }
  return false;
};

/**
 * Checks if an error is a network/connectivity error.
 *
 * @param error - The error to check
 * @returns True if the error is a network connectivity issue
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    // Check for fetch-related network errors
    if (error.message === 'fetch failed') {
      return true;
    }
    // Check cause for specific network error codes
    if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
      const code = (error.cause as { code: string }).code;
      return ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH'].includes(code);
    }
  }
  return false;
};

/** Track if we've already logged a connectivity error recently */
let lastConnectivityErrorTime = 0;
const CONNECTIVITY_ERROR_LOG_INTERVAL_MS = 60_000; // Log at most once per minute

/**
 * Configuration for session middleware.
 */
export interface SessionMiddlewareConfig {
  /** Appwrite configuration (endpoint and projectId) */
  appwrite: Omit<AppwriteConfig, 'apiKey'>;
}

/**
 * Extracts user session from cookies using Appwrite.
 * Handles network errors and auth errors gracefully.
 *
 * @param config - Session middleware configuration
 * @param cookies - SvelteKit cookies object
 * @returns Session result with user data or error information
 *
 * @example
 * ```typescript
 * // In hooks.server.ts
 * export const handle: Handle = async ({ event, resolve }) => {
 *   const result = await extractSession(
 *     { appwrite: { endpoint: APPWRITE_ENDPOINT, projectId: APPWRITE_PROJECT } },
 *     event.cookies
 *   );
 *
 *   if (result.session) {
 *     event.locals.userId = result.session.userId;
 *     event.locals.userEmail = result.session.userEmail;
 *   }
 *   event.locals.connectivityError = result.connectivityError;
 *
 *   return resolve(event);
 * };
 * ```
 */
export const extractSession = async (
  config: SessionMiddlewareConfig,
  cookies: Cookies
): Promise<SessionResult> => {
  try {
    const { account } = createSessionClient(config.appwrite, cookies);
    const user = await account.get();
    return {
      session: {
        userId: user.$id,
        userEmail: user.email,
      },
    };
  } catch (error: unknown) {
    if (isNetworkError(error)) {
      // Rate-limit logging to avoid spam
      const now = Date.now();
      if (now - lastConnectivityErrorTime > CONNECTIVITY_ERROR_LOG_INTERVAL_MS) {
        lastConnectivityErrorTime = now;
        console.error(
          '[Connectivity] Appwrite server unreachable. Check network or server status.'
        );
      }
      return { connectivityError: 'appwrite_unavailable' };
    }

    if (!isExpectedAuthError(error)) {
      console.error('Unexpected error while retrieving session', error);
    }

    return {};
  }
};

/**
 * Creates a SvelteKit handle function for session management.
 * This is a convenience wrapper around extractSession.
 *
 * @param config - Session middleware configuration
 * @returns A SvelteKit handle function
 *
 * @example
 * ```typescript
 * // In hooks.server.ts
 * import { createSessionHandle } from '@univ-lehavre/atlas-auth/hooks';
 *
 * export const handle = createSessionHandle({
 *   appwrite: {
 *     endpoint: APPWRITE_ENDPOINT,
 *     projectId: APPWRITE_PROJECT,
 *   },
 * });
 * ```
 */
export const createSessionHandle = (config: SessionMiddlewareConfig) => {
  return async ({
    event,
    resolve,
  }: {
    event: { cookies: Cookies; locals: Record<string, unknown> };
    resolve: (event: unknown) => Promise<Response>;
  }) => {
    const result = await extractSession(config, event.cookies);

    if (result.session) {
      event.locals['userId'] = result.session.userId;
      event.locals['userEmail'] = result.session.userEmail;
    }
    event.locals['connectivityError'] = result.connectivityError;

    return resolve(event);
  };
};
