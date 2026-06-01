import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { AppwriteException } from 'node-appwrite';
import { applySecurityHeaders } from '@univ-lehavre/atlas-sveltekit-csp';

import { SessionError } from '$lib/server/http';
import { createSessionClient } from '$lib/server/baas';

import type { Handle } from '@sveltejs/kit';

// Error aggregation — Phase 13.3 observability.
// Opt-in via the `SENTRY_DSN` environment variable. When the variable is
// absent (the default for local dev and any deploy without a Sentry
// account) `Sentry.init` is never called, so the SDK stays a complete
// no-op and never reaches an external service. The DSN is read at runtime
// from `$env/dynamic/private`, so toggling it requires no rebuild.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE ? Number(env.SENTRY_TRACES_SAMPLE_RATE) : 0,
    environment: env.SENTRY_ENVIRONMENT,
  });
}

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
export const session: Handle = async ({ event, resolve }) => {
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

  // Security headers — Phase 6.3 DevSecOps, factorisée Phase 9.2.
  // CSP est gérée par kit.csp dans svelte.config.js (avec nonces auto
  // pour les scripts d'hydration). Les cinq autres headers statiques
  // viennent de `@univ-lehavre/atlas-sveltekit-csp` pour rester alignés
  // entre toutes les apps SvelteKit du monorepo.
  applySecurityHeaders(response, event);

  return response;
};

// `sentryHandle()` runs first so the request transaction wraps the session
// + security-header work; `session` always runs and still applies the
// Phase 9.2 security headers (preserved invariant). `sentryHandle()` is a
// no-op when Sentry.init was never called.
export const handle: Handle = sequence(Sentry.sentryHandle(), session);

// Sentry captures uncaught server errors; when the SDK is uninitialised
// this simply forwards to SvelteKit's default behaviour.
export const handleError = Sentry.handleErrorWithSentry();
