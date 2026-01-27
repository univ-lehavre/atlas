import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mapErrorToResponse,
  ApplicationError,
  SessionError,
  InvalidJsonBodyError,
  InvalidContentTypeError,
} from './index';

describe('ApplicationError', () => {
  it('should create error with all properties', () => {
    const error = new ApplicationError('test_code', 400, 'Test message', {
      cause: 'Test cause',
      details: { key: 'value' },
    });

    expect(error.code).toBe('test_code');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Test message');
    expect(error.cause).toBe('Test cause');
    expect(error.details).toEqual({ key: 'value' });
    expect(error.name).toBe('ApplicationError');
  });

  it('should create error without optional properties', () => {
    const error = new ApplicationError('test_code', 500, 'Test message');

    expect(error.code).toBe('test_code');
    expect(error.httpStatus).toBe(500);
    expect(error.message).toBe('Test message');
    expect(error.cause).toBeUndefined();
    expect(error.details).toBeUndefined();
  });

  it('should be an instance of Error', () => {
    const error = new ApplicationError('test', 400, 'Test');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('SessionError', () => {
  it('should create with default message', () => {
    const error = new SessionError();

    expect(error.code).toBe('session_error');
    expect(error.httpStatus).toBe(401);
    expect(error.message).toBe('Session error');
    expect(error.name).toBe('SessionError');
  });

  it('should create with custom message and cause', () => {
    const error = new SessionError('Custom session error', { cause: 'Token expired' });

    expect(error.message).toBe('Custom session error');
    expect(error.cause).toBe('Token expired');
  });

  it('should be an instance of ApplicationError', () => {
    const error = new SessionError();
    expect(error).toBeInstanceOf(ApplicationError);
  });
});

describe('InvalidJsonBodyError', () => {
  it('should create with default message', () => {
    const error = new InvalidJsonBodyError();

    expect(error.code).toBe('invalid_json');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid JSON body');
    expect(error.name).toBe('InvalidJsonBodyError');
  });

  it('should create with custom message', () => {
    const error = new InvalidJsonBodyError('Malformed JSON');
    expect(error.message).toBe('Malformed JSON');
  });
});

describe('InvalidContentTypeError', () => {
  it('should create with default message', () => {
    const error = new InvalidContentTypeError();

    expect(error.code).toBe('invalid_content_type');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Content-Type must be application/json');
    expect(error.name).toBe('InvalidContentTypeError');
  });

  it('should create with custom message', () => {
    const error = new InvalidContentTypeError('Expected JSON');
    expect(error.message).toBe('Expected JSON');
  });
});

describe('mapErrorToResponse', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should map ApplicationError to response with status', async () => {
    const error = new ApplicationError('test_error', 400, 'Test error message');
    const response = mapErrorToResponse(error);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({
      code: 'test_error',
      message: 'Test error message',
    });
  });

  it('should include cause in response when present', async () => {
    const error = new ApplicationError('test_error', 422, 'Validation failed', {
      cause: 'Field is required',
    });
    const response = mapErrorToResponse(error);

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body).toEqual({
      code: 'test_error',
      message: 'Validation failed',
      cause: 'Field is required',
    });
  });

  it('should map SessionError correctly', async () => {
    const error = new SessionError('Not authenticated');
    const response = mapErrorToResponse(error);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toEqual({
      code: 'session_error',
      message: 'Not authenticated',
    });
  });

  it('should map unknown error to 500 response', async () => {
    const error = new Error('Something went wrong');
    const response = mapErrorToResponse(error);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toEqual({
      code: 'unexpected_error',
      message: 'Unknown error',
    });
  });

  it('should log unexpected errors to console', () => {
    const error = new Error('Unexpected failure');
    mapErrorToResponse(error);

    expect(console.error).toHaveBeenCalledWith('Unexpected error:', error);
  });

  it('should handle string thrown as error', async () => {
    const response = mapErrorToResponse('string error');

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.code).toBe('unexpected_error');
  });

  it('should handle null thrown as error', async () => {
    const response = mapErrorToResponse(null);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.code).toBe('unexpected_error');
  });
});
