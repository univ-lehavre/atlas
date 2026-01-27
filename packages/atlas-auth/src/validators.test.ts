import { describe, it, expect } from 'vitest';
import {
  validateSignupEmail,
  validateMagicUrlLogin,
  validateUserId,
  checkRequestBody,
} from './validators.js';
import {
  SessionError,
  NotAnEmailError,
  MagicUrlLoginValidationError,
  UserIdValidationError,
  RequestBodyValidationError,
} from '@univ-lehavre/atlas-errors';

const domainConfig = {
  allowedDomainsRegexp: String.raw`^.+@(example\.com|test\.org)$`,
};

describe('validateSignupEmail', () => {
  it('should return normalized email for valid input', async () => {
    // Using lowercase email since regex is case-sensitive
    const email = await validateSignupEmail('user@example.com', domainConfig);
    expect(email).toBe('user@example.com');
  });

  it('should remove subaddressing', async () => {
    const email = await validateSignupEmail('user+tag@example.com', domainConfig);
    expect(email).toBe('user@example.com');
  });

  it('should throw NotAnEmailError for missing email', async () => {
    await expect(validateSignupEmail(undefined, domainConfig)).rejects.toThrow(NotAnEmailError);
  });

  it('should throw NotAnEmailError for non-string email', async () => {
    await expect(validateSignupEmail(123, domainConfig)).rejects.toThrow(NotAnEmailError);
  });

  it('should throw NotAnEmailError for invalid email format', async () => {
    await expect(validateSignupEmail('not-an-email', domainConfig)).rejects.toThrow(
      NotAnEmailError
    );
  });

  it('should throw NotAnEmailError for disallowed domain', async () => {
    await expect(validateSignupEmail('user@other.com', domainConfig)).rejects.toThrow(
      NotAnEmailError
    );
  });
});

describe('validateMagicUrlLogin', () => {
  it('should return validated userId and secret', () => {
    const result = validateMagicUrlLogin('abc123', 'def456');
    expect(result).toEqual({ userId: 'abc123', secret: 'def456' });
  });

  it('should throw for missing userId', () => {
    expect(() => validateMagicUrlLogin(undefined, 'secret')).toThrow(MagicUrlLoginValidationError);
  });

  it('should throw for missing secret', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(() => validateMagicUrlLogin('userId', undefined)).toThrow(MagicUrlLoginValidationError);
  });

  it('should throw for non-string userId', () => {
    expect(() => validateMagicUrlLogin(123, 'secret')).toThrow(MagicUrlLoginValidationError);
  });

  it('should throw for non-hex userId', () => {
    expect(() => validateMagicUrlLogin('xyz', 'abc123')).toThrow(MagicUrlLoginValidationError);
  });

  it('should throw for non-hex secret', () => {
    expect(() => validateMagicUrlLogin('abc123', 'xyz')).toThrow(MagicUrlLoginValidationError);
  });
});

describe('validateUserId', () => {
  it('should return validated userId', () => {
    const result = validateUserId('abc123');
    expect(result).toBe('abc123');
  });

  it('should throw SessionError for missing userId', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(() => validateUserId(undefined)).toThrow(SessionError);
  });

  it('should throw UserIdValidationError for non-string', () => {
    expect(() => validateUserId(123)).toThrow(UserIdValidationError);
  });

  it('should throw UserIdValidationError for non-hex', () => {
    expect(() => validateUserId('xyz')).toThrow(UserIdValidationError);
  });
});

describe('checkRequestBody', () => {
  it('should extract required properties', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' }),
    });
    const result = await checkRequestBody(request, ['email']);
    expect(result).toEqual({ email: 'test@example.com' });
  });

  it('should throw for missing Content-Type', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    await expect(checkRequestBody(request, ['email'])).rejects.toThrow(RequestBodyValidationError);
  });

  it('should throw for wrong Content-Type', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    await expect(checkRequestBody(request, ['email'])).rejects.toThrow(RequestBodyValidationError);
  });

  it('should throw for invalid JSON', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    await expect(checkRequestBody(request, ['email'])).rejects.toThrow(RequestBodyValidationError);
  });

  it('should throw for missing required property', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    await expect(checkRequestBody(request, ['email'])).rejects.toThrow(RequestBodyValidationError);
  });
});
