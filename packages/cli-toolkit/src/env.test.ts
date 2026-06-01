import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getEnv, requireEnv } from './env.js';

describe('getEnv', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env['CLI_TK_A'];
    delete process.env['CLI_TK_B'];
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('returns the variable value when set', () => {
    process.env['CLI_TK_A'] = 'hello';
    expect(getEnv('CLI_TK_A')).toBe('hello');
  });

  it('returns the empty string by default when unset', () => {
    expect(getEnv('CLI_TK_A')).toBe('');
  });

  it('returns the fallback when unset', () => {
    expect(getEnv('CLI_TK_A', 'fallback')).toBe('fallback');
  });

  it('treats an empty string as missing and returns the fallback', () => {
    process.env['CLI_TK_A'] = '';
    expect(getEnv('CLI_TK_A', 'fallback')).toBe('fallback');
  });
});

describe('requireEnv', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env['CLI_TK_A'];
    delete process.env['CLI_TK_B'];
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('resolves all values when present', () => {
    process.env['CLI_TK_A'] = 'a';
    process.env['CLI_TK_B'] = 'b';
    const result = requireEnv(['CLI_TK_A', 'CLI_TK_B']);
    expect(result).toEqual({ ok: true, values: { CLI_TK_A: 'a', CLI_TK_B: 'b' } });
  });

  it('reports the missing names when some are absent or empty', () => {
    process.env['CLI_TK_A'] = 'a';
    process.env['CLI_TK_B'] = '';
    const result = requireEnv(['CLI_TK_A', 'CLI_TK_B']);
    expect(result).toEqual({ ok: false, missing: ['CLI_TK_B'] });
  });

  it('returns ok with an empty object when no names are requested', () => {
    expect(requireEnv([])).toEqual({ ok: true, values: {} });
  });
});
