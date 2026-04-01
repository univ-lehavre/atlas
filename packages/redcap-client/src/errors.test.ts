import { describe, it, expect } from 'vitest';
import { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';

describe('REDCap Errors', () => {
  describe('RedcapHttpError', () => {
    it('should create error with status and statusText', () => {
      const error = new RedcapHttpError({ status: 401, statusText: 'Unauthorized' });

      expect(error.status).toBe(401);
      expect(error.statusText).toBe('Unauthorized');
      expect(error.message).toContain('401');
      expect(error._tag).toBe('RedcapHttpError');
    });

    it('should create error with body', () => {
      const error = new RedcapHttpError({
        status: 404,
        statusText: 'Not Found',
        body: 'Resource does not exist',
      });

      expect(error.status).toBe(404);
      expect(error.body).toBe('Resource does not exist');
    });

    it('should create 500 server error', () => {
      const error = new RedcapHttpError({ status: 500, statusText: 'Internal Server Error' });

      expect(error.status).toBe(500);
      expect(error.isServerError).toBe(true);
    });

    it('should detect rate limit errors', () => {
      const error = new RedcapHttpError({ status: 429, statusText: 'Too Many Requests' });

      expect(error.status).toBe(429);
      expect(error.isRateLimitError).toBe(true);
      expect(error.isRetryable).toBe(true);
    });

    it('should detect auth errors', () => {
      const error401 = new RedcapHttpError({ status: 401, statusText: 'Unauthorized' });
      const error403 = new RedcapHttpError({ status: 403, statusText: 'Forbidden' });

      expect(error401.isAuthError).toBe(true);
      expect(error403.isAuthError).toBe(true);
    });

    it('should be an instance of Error', () => {
      const error = new RedcapHttpError({ status: 400, statusText: 'Bad Request' });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('RedcapApiError', () => {
    it('should create error with error message', () => {
      const error = new RedcapApiError({ error: 'Invalid token' });

      expect(error.error).toBe('Invalid token');
      expect(error.message).toBe('Invalid token');
      expect(error.code).toBeUndefined();
      expect(error._tag).toBe('RedcapApiError');
    });

    it('should create error with error and code', () => {
      const error = new RedcapApiError({ error: 'User not found', code: 'USER_NOT_FOUND' });

      expect(error.error).toBe('User not found');
      expect(error.code).toBe('USER_NOT_FOUND');
      expect(error.message).toContain('USER_NOT_FOUND');
    });

    it('should detect invalid token errors', () => {
      const error = new RedcapApiError({ error: 'Invalid API token' });

      expect(error.isInvalidToken).toBe(true);
    });

    it('should be an instance of Error', () => {
      const error = new RedcapApiError({ error: 'API Error' });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('RedcapNetworkError', () => {
    it('should create error with Error cause', () => {
      const cause = new Error('Connection refused');
      const error = new RedcapNetworkError({ cause });

      expect(error.cause).toBe(cause);
      expect(error._tag).toBe('RedcapNetworkError');
      expect(error.message).toContain('Connection refused');
    });

    it('should accept string cause', () => {
      const error = new RedcapNetworkError({ cause: 'DNS resolution failed' });

      expect(error.cause).toBe('DNS resolution failed');
    });

    it('should accept url parameter', () => {
      const error = new RedcapNetworkError({
        cause: 'Timeout',
        url: 'https://redcap.example.com/api/',
      });

      expect(error.url).toBe('https://redcap.example.com/api/');
      expect(error.message).toContain('redcap.example.com');
    });

    it('should detect timeout errors', () => {
      const error = new RedcapNetworkError({ cause: new Error('Request timed out') });

      expect(error.isTimeout).toBe(true);
      expect(error.isRetryable).toBe(true);
    });

    it('should detect connection refused errors', () => {
      const error = new RedcapNetworkError({ cause: new Error('ECONNREFUSED') });

      expect(error.isConnectionRefused).toBe(true);
      expect(error.isRetryable).toBe(true);
    });

    it('should be an instance of Error', () => {
      const error = new RedcapNetworkError({ cause: 'timeout' });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Error discrimination by _tag', () => {
    it('should distinguish between error types', () => {
      const httpError = new RedcapHttpError({ status: 500, statusText: 'Server Error' });
      const apiError = new RedcapApiError({ error: 'API Error' });
      const networkError = new RedcapNetworkError({ cause: 'Network Error' });

      expect(httpError._tag).toBe('RedcapHttpError');
      expect(apiError._tag).toBe('RedcapApiError');
      expect(networkError._tag).toBe('RedcapNetworkError');

      // Type discrimination function
      const getErrorType = (
        error: typeof httpError | typeof apiError | typeof networkError
      ): string => {
        switch (error._tag) {
          case 'RedcapHttpError': {
            return `HTTP ${error.status}`;
          }
          case 'RedcapApiError': {
            return `API: ${error.error}`;
          }
          case 'RedcapNetworkError': {
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
