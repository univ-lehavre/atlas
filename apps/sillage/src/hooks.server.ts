import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { AppwriteException } from 'node-appwrite';
import { applySecurityHeaders } from '@univ-lehavre/atlas-sveltekit-csp';

import { SessionError } from '$lib/errors';
import { createSessionClient } from '$lib/server/baas';

import type { Handle } from '@sveltejs/kit';

// Agrégation d'erreurs (serveur) — observabilité (#309).
// Opt-in via `SENTRY_DSN`. Absente (défaut en dev et tout déploiement sans
// compte Sentry), `Sentry.init` n'est jamais appelé : le SDK reste un no-op
// complet. DSN lu au runtime depuis `$env/dynamic/private` (aucun rebuild).
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE ? Number(env.SENTRY_TRACES_SAMPLE_RATE) : 0,
    environment: env.SENTRY_ENVIRONMENT,
  });
}

// Exporté pour les tests unitaires : `sequence()` requiert le store de requête
// serveur (AsyncLocalStorage) du vrai runtime ; l'invariant des security
// headers est donc testé directement sur ce handle interne.
export const session: Handle = async ({ event, resolve }) => {
  try {
    const { account } = createSessionClient(event.cookies);
    const user = await account.get();
    event.locals.userId = user.$id;
  } catch (error: unknown) {
    // Ne pas lancer l'erreur ici pour éviter de faire planter toute la requête.
    // On considère l'utilisateur comme non authentifié si la récupération échoue.
    const isSessionError = error instanceof SessionError;
    const isBaasAuthError = error instanceof AppwriteException && error.code === 401;
    if (!isSessionError && !isBaasAuthError) {
      console.error('Unexpected error while retrieving session', error);
    }
  }
  const response = await resolve(event);

  // Security headers — Phase 9.2 DevSecOps. CSP est gérée par kit.csp
  // dans svelte.config.js (avec nonces auto pour les scripts
  // d'hydration). Les cinq autres headers statiques viennent de
  // `@univ-lehavre/atlas-sveltekit-csp` pour rester alignés entre
  // toutes les apps SvelteKit du monorepo.
  applySecurityHeaders(response, event);

  return response;
};

// `sentryHandle()` en tête : la transaction de requête enveloppe la session +
// les security headers ; `session` s'exécute toujours et applique l'invariant
// Phase 9.2. No-op quand `Sentry.init` n'a pas été appelé.
export const handle: Handle = sequence(Sentry.sentryHandle(), session);

// Capture les erreurs serveur non gérées ; sans SDK initialisé, forwarde au
// comportement par défaut de SvelteKit.
export const handleError = Sentry.handleErrorWithSentry();
