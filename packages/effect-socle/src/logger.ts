/**
 * Shared logger layer for the Effect runtime socle.
 *
 * Replaces the scattered `quiet()` / `withMinimumLogLevel(None)` re-applied
 * at each frontier (cf. audit Effect 2026-06-04, écart E8) with a single
 * layer mounted once in the `AppLayer` of each process type
 * ([ADR 0045](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0045-runtime-central-effect.md)).
 *
 * The minimum level is read from the `LOG_LEVEL` environment variable
 * **at runtime boot** (not at module import) — 12-factor late-binding, the
 * explicit guard of ADR 0045. It also leaves a clean seam for E9 (the OTel
 * layer composes alongside this one in the `AppLayer`).
 *
 * @module
 */

import { Config, Effect, Layer, LogLevel, Logger } from 'effect';

/** Accepted `LOG_LEVEL` values, mapped to Effect `LogLevel` literals. */
const LEVELS = {
  all: LogLevel.All,
  trace: LogLevel.Trace,
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warning: LogLevel.Warning,
  warn: LogLevel.Warning,
  error: LogLevel.Error,
  fatal: LogLevel.Fatal,
  none: LogLevel.None,
  silent: LogLevel.None,
} as const;

/** Default minimum level when `LOG_LEVEL` is unset or unrecognised. */
export const DEFAULT_LOG_LEVEL: LogLevel.LogLevel = LogLevel.Info;

/**
 * Parses a `LOG_LEVEL` string into an Effect {@link LogLevel.LogLevel}.
 * Case-insensitive; unknown values fall back to {@link DEFAULT_LOG_LEVEL}.
 */
export const parseLogLevel = (raw: string | undefined): LogLevel.LogLevel => {
  const key = (raw ?? '').trim().toLowerCase();
  return key in LEVELS ? LEVELS[key as keyof typeof LEVELS] : DEFAULT_LOG_LEVEL;
};

/** `Config` reading `LOG_LEVEL` from the environment at runtime. */
export const LogLevelConfig: Config.Config<LogLevel.LogLevel> = Config.string('LOG_LEVEL').pipe(
  Config.withDefault(''),
  Config.map(parseLogLevel)
);

/**
 * Logger layer whose minimum level is read from `LOG_LEVEL` at boot.
 * `LogLevelConfig` has a default, so reading it cannot fail; `Effect.orDie`
 * discharges the (unreachable) `ConfigError` to keep the layer total.
 */
const EnvLoggerLayer: Layer.Layer<never> = LogLevelConfig.pipe(
  Effect.orDie,
  Effect.map(Logger.minimumLogLevel),
  Layer.unwrapEffect
);

/**
 * Logger layer setting the process minimum log level.
 *
 * - With no argument, the level is read from `LOG_LEVEL` at boot (the
 *   normal case for a service/CLI `AppLayer`).
 * - With an explicit `level`, it is fixed (useful for CLIs that must stay
 *   quiet regardless of env, e.g. `LogLevel.None`, and for tests).
 */
export const makeLoggerLayer = (level?: LogLevel.LogLevel): Layer.Layer<never> =>
  level === undefined ? EnvLoggerLayer : Logger.minimumLogLevel(level);

/**
 * Convenience layer that silences all logs (`LogLevel.None`). The
 * idiomatic replacement for the legacy `quiet()` helper at CLI frontiers
 * that must emit no Effect logs.
 */
export const QuietLoggerLayer: Layer.Layer<never> = makeLoggerLayer(LogLevel.None);
