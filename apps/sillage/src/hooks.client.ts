import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

import type { HandleClientError } from '@sveltejs/kit';

// Agrégation d'erreurs (navigateur) — observabilité (#309).
// Opt-in via `PUBLIC_SENTRY_DSN` : le DSN doit être `PUBLIC_`-préfixé car il
// part dans le bundle client. Absent (vide/undefined), `Sentry.init` n'est
// jamais appelé et le SDK reste un no-op complet — aucun appel externe.
const dsn = env.PUBLIC_SENTRY_DSN;
/* eslint-disable functional/no-expression-statements -- l'init du SDK Sentry est un effet de bord top-level inévitable, conditionné au DSN (opt-in). */
if (dsn !== undefined && dsn !== '') {
  Sentry.init({
    dsn,
    tracesSampleRate:
      env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE !== undefined &&
      env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE !== ''
        ? Number(env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
        : 0,
    environment: env.PUBLIC_SENTRY_ENVIRONMENT,
  });
}
/* eslint-enable functional/no-expression-statements -- fin de l'effet de bord d'init Sentry. */

// Capture les erreurs client non gérées ; simple passe-plat quand le SDK
// n'est pas initialisé (aucun PUBLIC_SENTRY_DSN configuré).
export const handleError: HandleClientError = Sentry.handleErrorWithSentry();
