import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { applySecurityHeaders } from '@univ-lehavre/atlas-sveltekit-csp';

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

/**
 * Crf-dashboard est un dashboard interne `private: true` (ADR 0011),
 * pas déployé en prod. Ce handle applique les mêmes security headers que le
 * reste du monorepo via `@univ-lehavre/atlas-sveltekit-csp` (Phase 9.2).
 */
// Exporté pour les tests unitaires : `handle` est désormais un `sequence()`
// qui requiert le store de requête serveur (AsyncLocalStorage) du vrai
// runtime ; l'invariant des security headers est donc testé directement ici.
export const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  applySecurityHeaders(response, event);
  return response;
};

// `sentryHandle()` en tête : la transaction de requête enveloppe le travail
// applicatif (security headers). No-op si `Sentry.init` n'a pas été appelé.
export const handle: Handle = sequence(Sentry.sentryHandle(), securityHeaders);

// Capture les erreurs serveur non gérées ; sans SDK initialisé, forwarde au
// comportement par défaut de SvelteKit.
export const handleError = Sentry.handleErrorWithSentry();
