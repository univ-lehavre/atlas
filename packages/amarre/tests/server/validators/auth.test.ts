import { describe, it, expect } from 'vitest';
import {
  validateSignupEmail,
  validateMagicUrlLogin,
  validateUserId,
  ensureJsonContentType,
  parseJsonBody,
} from '$lib/server/validators/auth';
import { NotAnEmailError, SessionError } from '$lib/errors';

// Node 20+ provides global Request/Response/fetch

describe('validateSignupEmail', () => {
  it('accepts a valid email string', async () => {
    await expect(validateSignupEmail('user@univ-lehavre.fr')).resolves.toBe('user@univ-lehavre.fr');
  });

  it('rejects missing email', async () => {
    await expect(validateSignupEmail()).rejects.toBeInstanceOf(NotAnEmailError);
  });

  it('rejects non-string email', async () => {
    await expect(validateSignupEmail(123)).rejects.toBeInstanceOf(NotAnEmailError);
  });

  it('rejects invalid email format', async () => {
    await expect(validateSignupEmail('invalid@')).rejects.toBeInstanceOf(NotAnEmailError);
  });
});

describe('validateMagicUrlLogin', () => {
  it('accepts hex userId and secret', () => {
    const { userId, secret } = validateMagicUrlLogin('a1b2', 'deadBEEF');
    expect(userId).toBe('a1b2');
    expect(secret).toBe('deadBEEF');
  });

  it('rejects missing values', () => {
    expect(() => validateMagicUrlLogin('abcd')).toThrow();
  });

  it('rejects non-string values', () => {
    expect(() => validateMagicUrlLogin(1, 2)).toThrow();
  });

  it('rejects non-hex input', () => {
    expect(() => validateMagicUrlLogin('xyz', '1234')).toThrow();
  });
});

describe('validateUserId', () => {
  it('accepts hex string', () => {
    expect(validateUserId('abcdef1234')).toBe('abcdef1234');
  });

  it('rejects missing userId', () => {
    expect(() => validateUserId()).toThrow(SessionError);
  });

  it('rejects non-string userId', () => {
    expect(() => validateUserId(42)).toThrow();
  });

  it('rejects non-hex userId', () => {
    expect(() => validateUserId('g123')).toThrow();
  });
});

describe('ensureJsonContentType', () => {
  it('passes for application/json', () => {
    const req = new Request('http://localhost', {
      headers: { 'content-type': 'application/json' },
    });
    expect(() => ensureJsonContentType(req)).not.toThrow();
  });

  it('throws for non-json content-type', () => {
    const req = new Request('http://localhost', { headers: { 'content-type': 'text/plain' } });
    expect(() => ensureJsonContentType(req)).toThrow();
  });
});

describe('parseJsonBody', () => {
  it('parses valid json object', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });
    await expect(parseJsonBody(req)).resolves.toEqual({ a: 1 });
  });

  it('rejects non-object body (array)', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([1, 2, 3]),
    });
    await expect(parseJsonBody(req)).rejects.toBeInstanceOf(Error);
  });

  it('rejects invalid json', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ invalid',
    });
    await expect(parseJsonBody(req)).rejects.toBeInstanceOf(Error);
  });
});
