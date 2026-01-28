import { describe, it, expect } from 'vitest';
import {
  ApplicationError,
  SessionError,
  InvalidJsonBodyError,
  InvalidContentTypeError,
  NotAnEmailError,
  NotPartOfAllianceError,
  MagicUrlLoginValidationError,
  UserIdValidationError,
  RequestBodyValidationError,
  mapErrorToApiResponse,
} from './index.js';

describe('ApplicationError', () => {
  it('should create error with all properties', () => {
    const error = new ApplicationError('test_error', 400, 'Test message', {
      cause: 'Test cause',
      details: { foo: 'bar' },
    });

    expect(error.code).toBe('test_error');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Test message');
    expect(error.cause).toBe('Test cause');
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.name).toBe('ApplicationError');
  });

  it('should be an instance of Error', () => {
    const error = new ApplicationError('test', 500, 'Test');
    expect(error).toBeInstanceOf(Error);
  });

  it('should work without options', () => {
    const error = new ApplicationError('test', 500, 'Test');
    expect(error.cause).toBeUndefined();
    expect(error.details).toBeUndefined();
  });
});

describe('SessionError', () => {
  it('should have correct defaults', () => {
    const error = new SessionError();
    expect(error.code).toBe('session_error');
    expect(error.httpStatus).toBe(401);
    expect(error.message).toBe('Session error');
    expect(error.name).toBe('SessionError');
  });

  it('should accept custom message and options', () => {
    const error = new SessionError('Custom message', { cause: 'Token expired' });
    expect(error.message).toBe('Custom message');
    expect(error.cause).toBe('Token expired');
  });
});

describe('InvalidJsonBodyError', () => {
  it('should have correct defaults', () => {
    const error = new InvalidJsonBodyError();
    expect(error.code).toBe('invalid_json');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid JSON body');
  });
});

describe('InvalidContentTypeError', () => {
  it('should have correct defaults', () => {
    const error = new InvalidContentTypeError();
    expect(error.code).toBe('invalid_content_type');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Content-Type must be application/json');
  });
});

describe('NotAnEmailError', () => {
  it('should have correct defaults', () => {
    const error = new NotAnEmailError();
    expect(error.code).toBe('invalid_email');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Registration not possible');
  });
});

describe('NotPartOfAllianceError', () => {
  it('should have correct defaults', () => {
    const error = new NotPartOfAllianceError();
    expect(error.code).toBe('not_in_alliance');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Registration not possible');
  });
});

describe('MagicUrlLoginValidationError', () => {
  it('should have correct defaults', () => {
    const error = new MagicUrlLoginValidationError();
    expect(error.code).toBe('magicurl_login_validation_error');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid magic link parameters');
  });
});

describe('UserIdValidationError', () => {
  it('should have correct defaults', () => {
    const error = new UserIdValidationError();
    expect(error.code).toBe('userid_validation_error');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid user id');
  });
});

describe('RequestBodyValidationError', () => {
  it('should have correct defaults', () => {
    const error = new RequestBodyValidationError();
    expect(error.code).toBe('request_body_validation_error');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid request body');
  });
});

describe('mapErrorToApiResponse', () => {
  it('should map ApplicationError correctly', () => {
    const error = new SessionError('No session', { cause: 'Cookie missing' });
    const result = mapErrorToApiResponse(error);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({
      data: null,
      error: {
        code: 'session_error',
        message: 'No session',
        cause: 'Cookie missing',
      },
    });
  });

  it('should map regular Error to internal_error', () => {
    const error = new Error('Something broke');
    const result = mapErrorToApiResponse(error);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      data: null,
      error: {
        code: 'internal_error',
        message: 'Something broke',
      },
    });
  });

  it('should handle unknown errors', () => {
    const result = mapErrorToApiResponse('string error');

    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      data: null,
      error: {
        code: 'internal_error',
        message: 'Unknown error',
      },
    });
  });

  it('should handle null/undefined', () => {
    expect(mapErrorToApiResponse(null).status).toBe(500);
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(mapErrorToApiResponse(undefined).status).toBe(500);
  });
});
