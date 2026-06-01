import { describe, it, expect } from 'vitest';
import { Effect, FiberRef, LogLevel } from 'effect';
import { quiet } from './effect.js';

describe('quiet', () => {
  it('preserves the success value of the wrapped program', async () => {
    const result = await Effect.runPromise(quiet(Effect.succeed(42)));
    expect(result).toBe(42);
  });

  it('preserves the error channel of the wrapped program', async () => {
    const exit = await Effect.runPromiseExit(quiet(Effect.fail('boom')));
    expect(exit._tag).toBe('Failure');
  });

  it('raises the minimum log level to None inside the program', async () => {
    const level = await Effect.runPromise(quiet(FiberRef.get(FiberRef.currentMinimumLogLevel)));
    expect(level).toBe(LogLevel.None);
  });
});
