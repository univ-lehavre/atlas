import { describe, it, expect } from 'vitest';
import { isEmail } from '$lib/validators';

describe('isEmail', () => {
  it('accepts common valid emails', () => {
    expect(isEmail('a@b.com')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isEmail('')).toBe(false);
    expect(isEmail('not-an-email')).toBe(false);
    expect(isEmail('user@')).toBe(false);
    expect(isEmail('user@domain')).toBe(false);
  });
});
