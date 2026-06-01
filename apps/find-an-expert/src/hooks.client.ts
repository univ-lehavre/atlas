import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

import type { HandleClientError } from '@sveltejs/kit';

// Error aggregation (browser) — Phase 13.3 observability.
// Opt-in via the PUBLIC_SENTRY_DSN environment variable. The DSN must be
// public-prefixed because it is shipped to the browser bundle. When it is
// absent (empty/undefined), Sentry.init is never called and the SDK stays
// a complete no-op.
const dsn = env.PUBLIC_SENTRY_DSN;
/* eslint-disable functional/no-conditional-statements, functional/no-expression-statements -- l'init du SDK Sentry est un effet de bord top-level inévitable, conditionné au DSN (opt-in). */
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
/* eslint-enable functional/no-conditional-statements, functional/no-expression-statements -- fin de l'effet de bord d'init Sentry. */

// Captures uncaught client errors; a no-op pass-through when the SDK is
// uninitialised (no PUBLIC_SENTRY_DSN configured).
export const handleError: HandleClientError = Sentry.handleErrorWithSentry();
