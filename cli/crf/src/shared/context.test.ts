import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveOutputMode, createCliContext, ExitCode } from './context.js';

describe('resolveOutputMode', () => {
  it('returns json when json=true', () => {
    expect(resolveOutputMode({ ci: false, json: true })).toBe('json');
  });
  it('returns ci when ci=true', () => {
    expect(resolveOutputMode({ ci: true, json: false })).toBe('ci');
  });
});

describe('createCliContext', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {
      CI: process.env['CI'],
      GITHUB_ACTIONS: process.env['GITHUB_ACTIONS'],
    };
    delete process.env['CI'];
    delete process.env['GITHUB_ACTIONS'];
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('sets json=true when json option is true', () => {
    const ctx = createCliContext({ ci: true, json: true });
    expect(ctx.json).toBe(true);
    expect(ctx.outputMode).toBe('json');
  });

  it('sets verbose and quiet defaults to false', () => {
    const ctx = createCliContext({ ci: true });
    expect(ctx.verbose).toBe(false);
    expect(ctx.quiet).toBe(false);
  });
});

describe('ExitCode', () => {
  it('Success is 0', () => expect(ExitCode.Success).toBe(0));
  it('Error is 1', () => expect(ExitCode.Error).toBe(1));
  it('InvalidConfig is 2', () => expect(ExitCode.InvalidConfig).toBe(2));
  it('NetworkError is 3', () => expect(ExitCode.NetworkError).toBe(3));
  it('AuthError is 4', () => expect(ExitCode.AuthError).toBe(4));
});
