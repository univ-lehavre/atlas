import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

import type { HandleClientError } from '@sveltejs/kit';

// Error aggregation (browser) — Phase 13.3 observability.
// Opt-in via the PUBLIC_SENTRY_DSN environment variable. The DSN must be
// public-prefixed because it is shipped to the browser bundle. When it is
// absent, Sentry.init is never called and the SDK stays a complete no-op.
if (env.PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: env.PUBLIC_SENTRY_DSN,
    tracesSampleRate: env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE
      ? Number(env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
      : 0,
    environment: env.PUBLIC_SENTRY_ENVIRONMENT,
  });
}

// Captures uncaught client errors; a no-op pass-through when the SDK is
// uninitialised (no PUBLIC_SENTRY_DSN configured).
export const handleError: HandleClientError = Sentry.handleErrorWithSentry();
