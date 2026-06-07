import { describe, it, expect } from '@effect/vitest';
import { afterEach } from 'vitest';
import { Effect, FiberRef, LogLevel } from 'effect';
import { quiet, runEffectCli } from './effect.js';

describe('quiet', () => {
  it.effect('preserves the success value of the wrapped program', () =>
    Effect.gen(function* () {
      const result = yield* quiet(Effect.succeed(42));
      expect(result).toBe(42);
    })
  );

  it.effect('preserves the error channel of the wrapped program', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(quiet(Effect.fail('boom')));
      expect(exit._tag).toBe('Failure');
    })
  );

  it.effect('raises the minimum log level to None inside the program', () =>
    Effect.gen(function* () {
      const level = yield* quiet(FiberRef.get(FiberRef.currentMinimumLogLevel));
      expect(level).toBe(LogLevel.None);
    })
  );
});

describe('runEffectCli', () => {
  const savedExitCode = process.exitCode;
  afterEach(() => {
    process.exitCode = savedExitCode;
  });

  it('runs a successful program without setting a failing exit code', async () => {
    process.exitCode = undefined;
    await runEffectCli(Effect.void);
    expect(process.exitCode).toBeUndefined();
  });

  it('maps a numeric ExitCode failure to process.exitCode as-is', async () => {
    await runEffectCli(Effect.fail(2));
    expect(process.exitCode).toBe(2);
  });

  it('uses the fallback exit code for a non-numeric failure', async () => {
    await runEffectCli(Effect.fail('boom'));
    expect(process.exitCode).toBe(1);
  });

  it('honours a custom fallback exit code', async () => {
    await runEffectCli(Effect.fail(new Error('x')), { fallbackExitCode: 7 });
    expect(process.exitCode).toBe(7);
  });

  it('silences the Effect logger while running', async () => {
    let observed: LogLevel.LogLevel | undefined;
    await runEffectCli(
      Effect.gen(function* () {
        observed = yield* FiberRef.get(FiberRef.currentMinimumLogLevel);
      })
    );
    expect(observed).toBe(LogLevel.None);
  });
});
