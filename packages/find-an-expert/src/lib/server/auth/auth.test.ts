import { describe, it, expect } from 'vitest';
import { ApplicationError, SessionError } from '$lib/server/http';
import {
  NotAnEmailError,
  MagicUrlLoginValidationError,
  UserIdValidationError,
  RequestBodyValidationError,
} from './errors';
import {
  validateSignupEmail,
  validateMagicUrlLogin,
  validateUserId,
  ensureJsonContentType,
  parseJsonBody,
  checkRequestBody,
} from './validators';

describe('NotAnEmailError', () => {
  it('should create with default message', () => {
    const error = new NotAnEmailError();

    expect(error.code).toBe('invalid_email');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Registration not possible');
    expect(error.name).toBe('NotAnEmailError');
  });

  it('should create with custom message and cause', () => {
    const error = new NotAnEmailError('Custom message', { cause: 'Invalid domain' });

    expect(error.message).toBe('Custom message');
    expect(error.cause).toBe('Invalid domain');
  });

  it('should be an instance of ApplicationError', () => {
    const error = new NotAnEmailError();
    expect(error).toBeInstanceOf(ApplicationError);
  });
});

describe('MagicUrlLoginValidationError', () => {
  it('should create with default message', () => {
    const error = new MagicUrlLoginValidationError();

    expect(error.code).toBe('magicurl_login_validation_error');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid magic link parameters');
  });

  it('should create with custom message', () => {
    const error = new MagicUrlLoginValidationError('Link expired');
    expect(error.message).toBe('Link expired');
  });
});

describe('UserIdValidationError', () => {
  it('should create with default message', () => {
    const error = new UserIdValidationError();

    expect(error.code).toBe('userid_validation_error');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid user id');
  });
});

describe('RequestBodyValidationError', () => {
  it('should create with default message', () => {
    const error = new RequestBodyValidationError();

    expect(error.code).toBe('request_body_validation_error');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid request body');
  });
});

describe('validateSignupEmail', () => {
  it('should throw for missing email', async () => {
    await expect(validateSignupEmail(undefined)).rejects.toThrow(NotAnEmailError);
  });

  it('should throw for null email', async () => {
    await expect(validateSignupEmail(null)).rejects.toThrow(NotAnEmailError);
  });

  it('should throw for non-string email', async () => {
    await expect(validateSignupEmail(123)).rejects.toThrow(NotAnEmailError);
  });

  it('should throw for invalid email format', async () => {
    await expect(validateSignupEmail('not-an-email')).rejects.toThrow(NotAnEmailError);
  });
});

describe('validateMagicUrlLogin', () => {
  it('should return validated userId and secret', () => {
    const result = validateMagicUrlLogin('abc123def456', 'fed654cba321');

    expect(result).toEqual({
      userId: 'abc123def456',
      secret: 'fed654cba321',
    });
  });

  it('should throw if userId is missing', () => {
    expect(() => validateMagicUrlLogin(undefined, 'abc123')).toThrow(MagicUrlLoginValidationError);
  });

  it('should throw if secret is missing', () => {
    expect(() => validateMagicUrlLogin('abc123', undefined)).toThrow(MagicUrlLoginValidationError);
  });

  it('should throw if userId is not a string', () => {
    expect(() => validateMagicUrlLogin(123, 'abc123')).toThrow(MagicUrlLoginValidationError);
  });

  it('should throw if secret is not a string', () => {
    expect(() => validateMagicUrlLogin('abc123', 456)).toThrow(MagicUrlLoginValidationError);
  });

  it('should throw if userId contains non-hex characters', () => {
    expect(() => validateMagicUrlLogin('xyz123', 'abc123')).toThrow(MagicUrlLoginValidationError);
  });

  it('should throw if secret contains non-hex characters', () => {
    expect(() => validateMagicUrlLogin('abc123', 'xyz456')).toThrow(MagicUrlLoginValidationError);
  });

  it('should accept uppercase hex characters', () => {
    const result = validateMagicUrlLogin('ABC123DEF456', 'FED654CBA321');
    expect(result.userId).toBe('ABC123DEF456');
  });
});

describe('validateUserId', () => {
  it('should return validated userId', () => {
    const result = validateUserId('abc123def456');
    expect(result).toBe('abc123def456');
  });

  it('should throw SessionError if userId is missing', () => {
    expect(() => validateUserId(undefined)).toThrow(SessionError);
  });

  it('should throw SessionError if userId is null', () => {
    expect(() => validateUserId(null)).toThrow(SessionError);
  });

  it('should throw UserIdValidationError if userId is not a string', () => {
    expect(() => validateUserId(123)).toThrow(UserIdValidationError);
  });

  it('should throw UserIdValidationError if userId contains non-hex characters', () => {
    expect(() => validateUserId('xyz123')).toThrow(UserIdValidationError);
  });
});

describe('ensureJsonContentType', () => {
  it('should not throw for application/json', () => {
    const request = new Request('http://test.com', {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(() => ensureJsonContentType(request)).not.toThrow();
  });

  it('should not throw for application/json with charset', () => {
    const request = new Request('http://test.com', {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

    expect(() => ensureJsonContentType(request)).not.toThrow();
  });

  it('should throw for text/plain', () => {
    const request = new Request('http://test.com', {
      headers: { 'Content-Type': 'text/plain' },
    });

    expect(() => ensureJsonContentType(request)).toThrow();
  });

  it('should throw when content-type is missing', () => {
    const request = new Request('http://test.com');

    expect(() => ensureJsonContentType(request)).toThrow();
  });
});

describe('parseJsonBody', () => {
  it('should parse valid JSON object', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await parseJsonBody(request);
    expect(result).toEqual({ key: 'value' });
  });

  it('should throw for array body', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify([1, 2, 3]),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseJsonBody(request)).rejects.toThrow();
  });

  it('should throw for null body', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: 'null',
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseJsonBody(request)).rejects.toThrow();
  });

  it('should throw for invalid JSON', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseJsonBody(request)).rejects.toThrow();
  });
});

describe('checkRequestBody', () => {
  it('should extract required properties', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await checkRequestBody(request, ['email', 'name']);
    expect(result).toEqual({ email: 'test@example.com', name: 'Test' });
  });

  it('should throw when content-type header is missing', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    await expect(checkRequestBody(request, ['email'])).rejects.toThrow(RequestBodyValidationError);
  });

  it('should throw for non-JSON content type', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: 'email=test@example.com',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    await expect(checkRequestBody(request, ['email'])).rejects.toThrow(RequestBodyValidationError);
  });

  it('should throw when required property is missing', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(checkRequestBody(request, ['email', 'password'])).rejects.toThrow(
      RequestBodyValidationError
    );
  });

  it('should throw for array body', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify(['email']),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(checkRequestBody(request, ['email'])).rejects.toThrow(RequestBodyValidationError);
  });
});
