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
 * Builds the service `AppLayer`: the logger (level from `LOG_LEVEL`) plus the
 * REDCap client mounted as `CrfClientService`. Composed once per process.
 */
export const makeAppLayer = (config: AppConfigType): Layer.Layer<CrfClientService> =>
  Layer.mergeAll(
    makeLoggerLayer(),
    makeCrfClientLayer({
      url: CrfUrl(config.crfApiUrl),
      token: CrfToken(config.crfApiToken),
    })
  );

/** The runtime type carried through the service handlers. */
export type CrfRuntime = AppRuntime<CrfClientService>;

/** Builds the central runtime for the CRF service from its `AppLayer`. */
export const makeCrfRuntime = (config: AppConfigType): CrfRuntime =>
  makeRuntime(makeAppLayer(config));
