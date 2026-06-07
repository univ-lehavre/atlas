import { describe, expect, it } from '@effect/vitest';
import { ConfigProvider, Effect, Layer, Logger, LogLevel } from 'effect';
import { DEFAULT_LOG_LEVEL, makeLoggerLayer, parseLogLevel, QuietLoggerLayer } from './logger.js';

describe('parseLogLevel', () => {
  it('maps every accepted literal (case-insensitive)', () => {
    expect(parseLogLevel('debug')).toBe(LogLevel.Debug);
    expect(parseLogLevel('DEBUG')).toBe(LogLevel.Debug);
    expect(parseLogLevel('  Info ')).toBe(LogLevel.Info);
    expect(parseLogLevel('warn')).toBe(LogLevel.Warning);
    expect(parseLogLevel('warning')).toBe(LogLevel.Warning);
    expect(parseLogLevel('error')).toBe(LogLevel.Error);
    expect(parseLogLevel('fatal')).toBe(LogLevel.Fatal);
    expect(parseLogLevel('none')).toBe(LogLevel.None);
    expect(parseLogLevel('silent')).toBe(LogLevel.None);
    expect(parseLogLevel('all')).toBe(LogLevel.All);
    expect(parseLogLevel('trace')).toBe(LogLevel.Trace);
  });

  it('falls back to the default for unknown or undefined input', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- exercises the undefined branch
    expect(parseLogLevel(undefined)).toBe(DEFAULT_LOG_LEVEL);
    expect(parseLogLevel('')).toBe(DEFAULT_LOG_LEVEL);
    expect(parseLogLevel('verbose')).toBe(DEFAULT_LOG_LEVEL);
    expect(DEFAULT_LOG_LEVEL).toBe(LogLevel.Info);
  });
});

describe('makeLoggerLayer (fixed level)', () => {
  it.effect('suppresses logs below the configured minimum', () =>
    Effect.gen(function* () {
      const lines: string[] = [];
      const capture = Logger.replace(
        Logger.defaultLogger,
        Logger.make(({ message }) => {
          lines.push(String(message));
        })
      );

      yield* Effect.gen(function* () {
        yield* Effect.logInfo('info-line');
        yield* Effect.logError('error-line');
      }).pipe(
        // Error-only minimum: the info line must be dropped.
        Effect.provide(makeLoggerLayer(LogLevel.Error)),
        Effect.provide(capture)
      );

      expect(lines).toContain('error-line');
      expect(lines).not.toContain('info-line');
    })
  );

  it.effect('QuietLoggerLayer silences everything', () =>
    Effect.gen(function* () {
      const lines: string[] = [];
      const capture = Logger.replace(
        Logger.defaultLogger,
        Logger.make(({ message }) => {
          lines.push(String(message));
        })
      );

      yield* Effect.gen(function* () {
        yield* Effect.logError('should-not-appear');
        yield* Effect.logFatal('also-suppressed');
      }).pipe(Effect.provide(QuietLoggerLayer), Effect.provide(capture));

      expect(lines).toHaveLength(0);
    })
  );
});

describe('makeLoggerLayer (env-driven)', () => {
  it.effect('reads LOG_LEVEL from the environment at boot', () =>
    Effect.gen(function* () {
      const lines: string[] = [];
      const capture = Logger.replace(
        Logger.defaultLogger,
        Logger.make(({ message }) => {
          lines.push(String(message));
        })
      );
      // LOG_LEVEL=error → info dropped, error kept, via the no-arg layer.
      const envLayer = Layer.setConfigProvider(
        ConfigProvider.fromMap(new Map([['LOG_LEVEL', 'error']]))
      );

      yield* Effect.gen(function* () {
        yield* Effect.logInfo('env-info');
        yield* Effect.logError('env-error');
      }).pipe(Effect.provide(makeLoggerLayer()), Effect.provide(capture), Effect.provide(envLayer));

      expect(lines).toContain('env-error');
      expect(lines).not.toContain('env-info');
    })
  );
});
