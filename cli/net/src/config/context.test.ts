import { describe, it, expect } from 'vitest';
import { detectCi } from './context.js';

const setEnv = (key: string, value: string | undefined): void => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};

const withCleanEnv = (run: () => void): void => {
  const saved = {
    CI: process.env['CI'],
    CONTINUOUS_INTEGRATION: process.env['CONTINUOUS_INTEGRATION'],
    GITHUB_ACTIONS: process.env['GITHUB_ACTIONS'],
  };
  for (const k of Object.keys(saved)) delete process.env[k];
  try {
    run();
  } finally {
    for (const [k, v] of Object.entries(saved)) setEnv(k, v);
  }
};

describe('detectCi', () => {
  it('returns true when CI is set', () => {
    withCleanEnv(() => {
      process.env['CI'] = '1';
      expect(detectCi()).toBe(true);
    });
  });
  it('returns true when CONTINUOUS_INTEGRATION is set', () => {
    withCleanEnv(() => {
      process.env['CONTINUOUS_INTEGRATION'] = 'true';
      expect(detectCi()).toBe(true);
    });
  });
  it('returns true when GITHUB_ACTIONS is set', () => {
    withCleanEnv(() => {
      process.env['GITHUB_ACTIONS'] = 'true';
      expect(detectCi()).toBe(true);
    });
  });
  it('returns true when tests run without a TTY (the default for vitest)', () => {
    withCleanEnv(() => {
      expect(detectCi()).toBe(true);
    });
  });
});
