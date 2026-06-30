/**
 * Boot-time wiring for the CRF service: configuration, `AppLayer` and the
 * central Effect runtime (écarts E10/E8/E7,
 * [ADR 0045](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0045-runtime-central-effect.md)).
 *
 * The `AppLayer` composes — **once** — the logger
 * ([effect-socle](https://github.com/univ-lehavre/atlas/tree/main/packages/effect-socle))
 * and the REDCap client as an Effect service (`CrfClientService` via
 * `makeCrfClientLayer`, écart E7). Routes depend on `CrfClientService` by
 * injection; the runtime carries the layer, so handlers run via
 * `runtime.runPromise` (effect-handler) without re-providing anything.
 *
 * Config is read **at boot** (here), not at module import — the former
 * `Effect.runSync(AppConfig)` in `env.ts` ran on import, freezing config too
 * early. The CRF service's settings (port, token, auth) are legitimately
 * boot-time; this is the controlled boot point.
 *
 * @module
 */

import { Config, Effect, Layer } from 'effect';
import { makeLoggerLayer, makeRuntime, type AppRuntime } from '@univ-lehavre/atlas-effect-socle';
import { CrfUrl, CrfToken, makeCrfClientLayer } from '@univ-lehavre/atlas-crf-client';
import type { CrfClientService } from '@univ-lehavre/atlas-crf-client';
import { makeTracerLayer } from './telemetry.js';
import { makeMetrics, type MetricsHandle } from './metrics.js';

/** Environment configuration of the CRF service, read once at boot. */
export const AppConfig = Config.all({
  port: Config.number('PORT').pipe(Config.withDefault(3000)),
  crfApiUrl: Config.string('REDCAP_API_URL').pipe(
    Config.validate({
      message: 'Must be a valid HTTP(S) URL',
      validation: (s) => /^https?:\/\/.+/.test(s),
    })
  ),
  crfApiToken: Config.nonEmptyString('REDCAP_API_TOKEN'),
  // Static Bearer secret guarding /api/* (ADR 0041). Required: the service
  // exposes nominative data and must not start unauthenticated (fail-closed).
  authToken: Config.nonEmptyString('CRF_AUTH_TOKEN'),
  disableRateLimit: Config.boolean('DISABLE_RATE_LIMIT').pipe(Config.withDefault(false)),
});

export type AppConfigType = Config.Config.Success<typeof AppConfig>;

/** Reads the service configuration from the environment (boot-time). */
export const loadConfig = (): AppConfigType => Effect.runSync(AppConfig);

/**
 * Builds the service `AppLayer`: the logger (level from `LOG_LEVEL`), the
 * Effect↔OTel tracer bridge (so `Effect.withSpan` business spans correlate with
 * the HTTP spans — écart E9), the Effect↔OTel **metrics** bridge (ADR 0089;
 * `Layer.empty` when metrics are disabled), and the REDCap client mounted as
 * `CrfClientService`. Composed once per process.
 *
 * @param config - Boot-time configuration.
 * @param metricsLayer - The metrics bridge from {@link makeMetrics}; defaults to
 *   `Layer.empty` so callers that don't wire metrics keep the prior behaviour.
 */
export const makeAppLayer = (
  config: AppConfigType,
  metricsLayer: Layer.Layer<never> = Layer.empty
): Layer.Layer<CrfClientService> =>
  Layer.mergeAll(
    makeLoggerLayer(),
    makeTracerLayer(),
    metricsLayer,
    makeCrfClientLayer({
      url: CrfUrl(config.crfApiUrl),
      token: CrfToken(config.crfApiToken),
    })
  );

/** The runtime type carried through the service handlers. */
export type CrfRuntime = AppRuntime<CrfClientService>;

/**
 * Builds the central runtime for the CRF service from its `AppLayer`, plus the
 * metrics handle whose `render` feeds the `/metrics` route (ADR 0089). The
 * handle's `layer` is merged into the `AppLayer` so Effect `Metric.*` values are
 * exported through the Prometheus reader; its `render` is returned for the route.
 *
 * @param config - Boot-time configuration.
 * @param env - Environment to inspect for metrics enablement (defaults to
 *   `process.env`); injectable for tests.
 */
export const makeCrfRuntime = (
  config: AppConfigType,
  env: NodeJS.ProcessEnv = process.env
): { readonly runtime: CrfRuntime; readonly metrics: MetricsHandle } => {
  const metrics = makeMetrics(env);
  return { runtime: makeRuntime(makeAppLayer(config, metrics.layer)), metrics };
};
