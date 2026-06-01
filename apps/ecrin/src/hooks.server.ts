import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { applySecurityHeaders } from '@univ-lehavre/atlas-sveltekit-csp';

import { SessionError } from '$lib/errors';
import { createSessionClient } from '$lib/baas/server';

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

export const session: Handle = async ({ event, resolve }) => {
  try {
    const { account } = createSessionClient(event.cookies);
    const user = await account.get();
    event.locals.userId = user.$id;
  } catch (error) {
    // Ne pas lancer l'erreur ici pour éviter de faire planter toute la requête.
    // On considère l'utilisateur comme non authentifié si la récupération échoue.
    if (!(error instanceof SessionError))
      console.error('Unexpected error while retrieving session', error);
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
