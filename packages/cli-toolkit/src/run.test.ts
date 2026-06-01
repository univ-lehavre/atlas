import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runMain } from './run.js';

const noop = (): void => {
  /* intentionally empty */
};

describe('runMain', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => noop()) as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(noop);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('resolves without exiting when main succeeds', async () => {
    const main = vi.fn(() => Promise.resolve());
    runMain(main);
    await Promise.resolve();
    expect(main).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reports the error and exits 1 by default when main rejects', async () => {
    const boom = new Error('boom');
    runMain(() => Promise.reject(boom));
    await new Promise((r) => setTimeout(r, 0));
    expect(errorSpy).toHaveBeenCalledWith('Fatal error:', boom);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('honours a custom exit code', async () => {
    runMain(() => Promise.reject(new Error('x')), { exitCode: 2 });
    await new Promise((r) => setTimeout(r, 0));
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('uses a custom onError reporter instead of console.error', async () => {
    const onError = vi.fn();
    const boom = new Error('custom');
    runMain(() => Promise.reject(boom), { onError });
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalledWith(boom);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
