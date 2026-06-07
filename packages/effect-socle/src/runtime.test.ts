import { describe, expect, it, vi } from 'vitest';
import { Context, Effect, Layer } from 'effect';
import { makeRuntime, makeRuntimeWithShutdown } from './runtime.js';

// A tiny service to prove the AppLayer is actually wired into the runtime.
class Greeting extends Context.Tag('test/Greeting')<Greeting, string>() {}
const GreetingLayer = Layer.succeed(Greeting, 'hello');

describe('makeRuntime', () => {
  it('runs an Effect against the provided AppLayer', async () => {
    const runtime = makeRuntime(GreetingLayer);
    try {
      const result = await runtime.runPromise(Greeting);
      expect(result).toBe('hello');
    } finally {
      await runtime.dispose();
    }
  });

  it('runs successive Effects on the same runtime', async () => {
    const runtime = makeRuntime(GreetingLayer);
    try {
      const a = await runtime.runPromise(Greeting.pipe(Effect.map((g) => `${g} 1`)));
      const b = await runtime.runPromise(Greeting.pipe(Effect.map((g) => `${g} 2`)));
      expect([a, b]).toEqual(['hello 1', 'hello 2']);
    } finally {
      await runtime.dispose();
    }
  });
});

describe('makeRuntimeWithShutdown', () => {
  it('registers SIGTERM and SIGINT handlers', async () => {
    const registered: NodeJS.Signals[] = [];
    const runtime = makeRuntimeWithShutdown(GreetingLayer, (signal) => {
      registered.push(signal);
    });
    try {
      expect(registered).toEqual(['SIGTERM', 'SIGINT']);
      // The runtime is usable like any other.
      expect(await runtime.runPromise(Greeting)).toBe('hello');
    } finally {
      await runtime.dispose();
    }
  });

  it('disposes the runtime when a registered signal handler fires', () => {
    const handlers = new Map<NodeJS.Signals, () => void>();
    makeRuntimeWithShutdown(GreetingLayer, (signal, handler) => {
      handlers.set(signal, handler);
    });

    // Fire the SIGTERM handler — it disposes the runtime without throwing.
    expect(() => handlers.get('SIGTERM')?.()).not.toThrow();
  });

  it('registers on process.once by default', async () => {
    const spy = vi.spyOn(process, 'once').mockImplementation(() => process);
    try {
      const runtime = makeRuntimeWithShutdown(GreetingLayer);
      expect(spy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(spy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      await runtime.dispose();
    } finally {
      spy.mockRestore();
    }
  });
});
