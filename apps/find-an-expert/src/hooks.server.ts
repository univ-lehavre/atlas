import type { Handle } from '@sveltejs/kit';
import { AppwriteException } from 'node-appwrite';

import { SessionError } from '$lib/server/http';
import { createSessionClient } from '$lib/server/baas';

/**
 * Checks if an error is an expected authentication error.
 * @param error - The error to check
 * @returns True if the error is expected for unauthenticated users
 */
const isExpectedAuthError = (error: unknown): boolean => {
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
 * @param error - The error to check
 * @returns True if the error is a network connectivity issue
 */
const isNetworkError = (error: unknown): boolean => {
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
 * SvelteKit server hook that extracts user session from cookies.
 * On each request, retrieves user ID from Appwrite session cookie
 * and attaches it to event.locals.userId.
 */
export const handle: Handle = async ({ event, resolve }) => {
  try {
    const { account } = createSessionClient(event.cookies);
    const user = await account.get();
    event.locals.userId = user.$id;
    event.locals.userEmail = user.email;
    event.locals.connectivityError = undefined;
  } catch (error: unknown) {
    if (isNetworkError(error)) {
      // Set connectivity error flag for the request
      event.locals.connectivityError = 'baas_unavailable';

      // Rate-limit logging to avoid spam
      const now = Date.now();
      if (now - lastConnectivityErrorTime > CONNECTIVITY_ERROR_LOG_INTERVAL_MS) {
        lastConnectivityErrorTime = now;
        console.error(
          '[Connectivity] Appwrite server unreachable. Check network or server status.'
        );
      }
    } else if (!isExpectedAuthError(error)) {
      console.error('Unexpected error while retrieving session', error);
    }
  }
  const response = await resolve(event);

  // Security headers — Phase 6.3 DevSecOps. CSP gérée par kit.csp dans
  // svelte.config.js (avec nonces auto pour les scripts d'hydration).
  if (event.url.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  // X-Frame-Options redondant avec CSP `frame-ancestors 'none'`, conservé
  // en defense-in-depth pour les vieux navigateurs.
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
};
