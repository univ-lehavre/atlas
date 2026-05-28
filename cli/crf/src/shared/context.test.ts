import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createCliContext,
  detectCi,
  ExitCode,
  makeCliContextLayer,
  resolveOutputMode,
} from './context.js';

const setEnv = (key: string, value: string | undefined): void => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};

const withCleanEnv = (run: () => void): void => {
  const saved = {
    CI: process.env['CI'],
    CONTINUOUS_INTEGRATION: process.env['CONTINUOUS_INTEGRATION'],
    GITHUB_ACTIONS: process.env['GITHUB_ACTIONS'],
    GITLAB_CI: process.env['GITLAB_CI'],
    JENKINS_URL: process.env['JENKINS_URL'],
  };
  for (const k of Object.keys(saved)) delete process.env[k];
  try {
    run();
  } finally {
    for (const [k, v] of Object.entries(saved)) setEnv(k, v);
  }
};

describe('resolveOutputMode', () => {
  it('returns json when json=true (precedence over ci)', () => {
    expect(resolveOutputMode({ ci: false, json: true })).toBe('json');
    expect(resolveOutputMode({ ci: true, json: true })).toBe('json');
  });
  it('returns ci when ci=true', () => {
    expect(resolveOutputMode({ ci: true, json: false })).toBe('ci');
  });
  it('returns ci when ci=false and tests run without a TTY (detectCi=true)', () => {
    withCleanEnv(() => {
      expect(resolveOutputMode({ ci: false, json: false })).toBe('ci');
    });
  });
});

describe('detectCi', () => {
  it('returns true when CI environment variable is set', () => {
    withCleanEnv(() => {
      process.env['CI'] = '1';
      expect(detectCi()).toBe(true);
    });
  });
  it('returns true when GITHUB_ACTIONS is set', () => {
    withCleanEnv(() => {
      process.env['GITHUB_ACTIONS'] = 'true';
      expect(detectCi()).toBe(true);
    });
  });
  it('returns true when CONTINUOUS_INTEGRATION is set', () => {
    withCleanEnv(() => {
      process.env['CONTINUOUS_INTEGRATION'] = 'true';
      expect(detectCi()).toBe(true);
    });
  });
  it('returns true when GITLAB_CI is set', () => {
    withCleanEnv(() => {
      process.env['GITLAB_CI'] = 'true';
      expect(detectCi()).toBe(true);
    });
  });
  it('returns true when JENKINS_URL is set', () => {
    withCleanEnv(() => {
      process.env['JENKINS_URL'] = 'http://jenkins.example.com';
      expect(detectCi()).toBe(true);
    });
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
    for (const [k, v] of Object.entries(savedEnv)) setEnv(k, v);
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

  it('falls back to detectCi when ci is not provided', () => {
    const ctx = createCliContext({});
    expect(ctx.ci).toBe(true);
  });

  it('propagates verbose and quiet when provided', () => {
    const ctx = createCliContext({ ci: true, verbose: true, quiet: true });
    expect(ctx.verbose).toBe(true);
    expect(ctx.quiet).toBe(true);
  });
});

describe('makeCliContextLayer', () => {
  it('returns a Layer that can be provided', () => {
    const layer = makeCliContextLayer({ ci: true, json: false });
    expect(layer).toBeDefined();
  });
});

describe('ExitCode', () => {
  it('Success is 0', () => expect(ExitCode.Success).toBe(0));
  it('Error is 1', () => expect(ExitCode.Error).toBe(1));
  it('InvalidConfig is 2', () => expect(ExitCode.InvalidConfig).toBe(2));
  it('NetworkError is 3', () => expect(ExitCode.NetworkError).toBe(3));
  it('AuthError is 4', () => expect(ExitCode.AuthError).toBe(4));
});
