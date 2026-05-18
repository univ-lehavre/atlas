import { describe, it, expect } from 'vitest';
import { CrfHttpError, CrfApiError, CrfNetworkError } from './errors.js';

describe('REDCap Errors', () => {
  describe('CrfHttpError', () => {
    it('should create error with status and statusText', () => {
      const error = new CrfHttpError({ status: 401, statusText: 'Unauthorized' });

      expect(error.status).toBe(401);
      expect(error.statusText).toBe('Unauthorized');
      expect(error.message).toContain('401');
      expect(error._tag).toBe('CrfHttpError');
    });

    it('should create error with body', () => {
      const error = new CrfHttpError({
        status: 404,
        statusText: 'Not Found',
        body: 'Resource does not exist',
      });

      expect(error.status).toBe(404);
      expect(error.body).toBe('Resource does not exist');
    });

    it('should create 500 server error', () => {
      const error = new CrfHttpError({ status: 500, statusText: 'Internal Server Error' });

      expect(error.status).toBe(500);
      expect(error.isServerError).toBe(true);
    });

    it('should detect rate limit errors', () => {
      const error = new CrfHttpError({ status: 429, statusText: 'Too Many Requests' });

      expect(error.status).toBe(429);
      expect(error.isRateLimitError).toBe(true);
      expect(error.isRetryable).toBe(true);
    });

    it('should detect auth errors', () => {
      const error401 = new CrfHttpError({ status: 401, statusText: 'Unauthorized' });
      const error403 = new CrfHttpError({ status: 403, statusText: 'Forbidden' });

      expect(error401.isAuthError).toBe(true);
      expect(error403.isAuthError).toBe(true);
    });

    it('should be an instance of Error', () => {
      const error = new CrfHttpError({ status: 400, statusText: 'Bad Request' });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('CrfApiError', () => {
    it('should create error with error message', () => {
      const error = new CrfApiError({ error: 'Invalid token' });

      expect(error.error).toBe('Invalid token');
      expect(error.message).toBe('Invalid token');
      expect(error.code).toBeUndefined();
      expect(error._tag).toBe('CrfApiError');
    });

    it('should create error with error and code', () => {
      const error = new CrfApiError({ error: 'User not found', code: 'USER_NOT_FOUND' });

      expect(error.error).toBe('User not found');
      expect(error.code).toBe('USER_NOT_FOUND');
      expect(error.message).toContain('USER_NOT_FOUND');
    });

    it('should detect invalid token errors', () => {
      const error = new CrfApiError({ error: 'Invalid API token' });

      expect(error.isInvalidToken).toBe(true);
    });

    it('should be an instance of Error', () => {
      const error = new CrfApiError({ error: 'API Error' });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('CrfNetworkError', () => {
    it('should create error with Error cause', () => {
      const cause = new Error('Connection refused');
      const error = new CrfNetworkError({ cause });

      expect(error.cause).toBe(cause);
      expect(error._tag).toBe('CrfNetworkError');
      expect(error.message).toContain('Connection refused');
    });

    it('should accept string cause', () => {
      const error = new CrfNetworkError({ cause: 'DNS resolution failed' });

      expect(error.cause).toBe('DNS resolution failed');
    });

    it('should accept url parameter', () => {
      const error = new CrfNetworkError({
        cause: 'Timeout',
        url: 'https://redcap.example.com/api/',
      });

      expect(error.url).toBe('https://redcap.example.com/api/');
      expect(error.message).toContain('redcap.example.com');
    });

    it('should detect timeout errors', () => {
      const error = new CrfNetworkError({ cause: new Error('Request timed out') });

      expect(error.isTimeout).toBe(true);
      expect(error.isRetryable).toBe(true);
    });

    it('should detect connection refused errors', () => {
      const error = new CrfNetworkError({ cause: new Error('ECONNREFUSED') });

      expect(error.isConnectionRefused).toBe(true);
      expect(error.isRetryable).toBe(true);
    });

    it('should be an instance of Error', () => {
      const error = new CrfNetworkError({ cause: 'timeout' });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Error discrimination by _tag', () => {
    it('should distinguish between error types', () => {
      const httpError = new CrfHttpError({ status: 500, statusText: 'Server Error' });
      const apiError = new CrfApiError({ error: 'API Error' });
      const networkError = new CrfNetworkError({ cause: 'Network Error' });

      expect(httpError._tag).toBe('CrfHttpError');
      expect(apiError._tag).toBe('CrfApiError');
      expect(networkError._tag).toBe('CrfNetworkError');

      // Type discrimination function
      const getErrorType = (
        error: typeof httpError | typeof apiError | typeof networkError
      ): string => {
        switch (error._tag) {
          case 'CrfHttpError': {
            return `HTTP ${error.status}`;
          }
          case 'CrfApiError': {
            return `API: ${error.error}`;
          }
          case 'CrfNetworkError': {
            return `Network: ${String(error.cause)}`;
          }
        }
      };

      expect(getErrorType(httpError)).toBe('HTTP 500');
      expect(getErrorType(apiError)).toBe('API: API Error');
      expect(getErrorType(networkError)).toBe('Network: Network Error');
    });
  });
});
