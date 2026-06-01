import { describe, it, expect } from 'vitest';
import { hasFlag, getFlagValue, findUnknownFlags } from './flags.js';

describe('hasFlag', () => {
  it('returns true when any alias is present', () => {
    expect(hasFlag(['--batch'], '--batch', '--yes')).toBe(true);
    expect(hasFlag(['--yes'], '--batch', '--yes')).toBe(true);
  });

  it('returns false when none are present', () => {
    expect(hasFlag(['--other'], '--batch', '--yes')).toBe(false);
    expect(hasFlag([], '--batch')).toBe(false);
  });
});

describe('getFlagValue', () => {
  it('returns the token after the flag', () => {
    expect(getFlagValue(['--threshold', '0.3'], '--threshold')).toBe('0.3');
  });

  it('returns undefined when the flag is absent', () => {
    expect(getFlagValue(['--other', 'x'], '--threshold')).toBeUndefined();
  });

  it('returns undefined when the flag has no following token', () => {
    expect(getFlagValue(['--threshold'], '--threshold')).toBeUndefined();
  });
});

describe('findUnknownFlags', () => {
  it('returns an empty list when everything is known', () => {
    const unknown = findUnknownFlags(['--batch', '--threshold', '0.3'], {
      booleanFlags: ['--batch'],
      valueFlags: ['--threshold'],
    });
    expect(unknown).toEqual([]);
  });

  it('flags unknown tokens', () => {
    const unknown = findUnknownFlags(['--threshold', '0.3', '--oops'], {
      valueFlags: ['--threshold'],
    });
    expect(unknown).toEqual(['--oops']);
  });

  it('does not treat a value-flag argument as unknown', () => {
    const unknown = findUnknownFlags(['--top', '10'], {
      valueFlags: ['--top'],
    });
    expect(unknown).toEqual([]);
  });

  it('treats everything as unknown with no known flags configured', () => {
    expect(findUnknownFlags(['--bogus'])).toEqual(['--bogus']);
  });

  it('handles a value-flag at index 0 with no preceding token', () => {
    expect(findUnknownFlags(['10'], { valueFlags: ['--top'] })).toEqual(['10']);
  });
});
