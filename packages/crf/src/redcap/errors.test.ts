import { describe, it, expect } from 'vitest';
import { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';

describe('REDCap Errors', () => {
  describe('RedcapHttpError', () => {
    it('should create error with status and message', () => {
      const error = new RedcapHttpError({ status: 401, message: 'Unauthorized' });

      expect(error.status).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error._tag).toBe('RedcapHttpError');
    });

    it('should create 404 error', () => {
      const error = new RedcapHttpError({ status: 404, message: 'Not found' });

      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
    });

    it('should create 500 server error', () => {
      const error = new RedcapHttpError({ status: 500, message: 'Internal Server Error' });

      expect(error.status).toBe(500);
      expect(error.message).toBe('Internal Server Error');
    });

    it('should create 429 rate limit error', () => {
      const error = new RedcapHttpError({ status: 429, message: 'Too Many Requests' });

      expect(error.status).toBe(429);
      expect(error.message).toBe('Too Many Requests');
    });

    it('should be an instance of Error', () => {
      const error = new RedcapHttpError({ status: 400, message: 'Bad Request' });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('RedcapApiError', () => {
    it('should create error with message only', () => {
      const error = new RedcapApiError({ message: 'Invalid token' });

      expect(error.message).toBe('Invalid token');
      expect(error.status).toBeUndefined();
      expect(error._tag).toBe('RedcapApiError');
    });

    it('should create error with message and optional status', () => {
      const error = new RedcapApiError({ message: 'User not found', status: 404 });

      expect(error.message).toBe('User not found');
      expect(error.status).toBe(404);
    });

    it('should create error with 400 status for validation', () => {
      const error = new RedcapApiError({ message: 'Invalid field name', status: 400 });

      expect(error.message).toBe('Invalid field name');
      expect(error.status).toBe(400);
    });

    it('should be an instance of Error', () => {
      const error = new RedcapApiError({ message: 'API Error' });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('RedcapNetworkError', () => {
    it('should create error with unknown cause', () => {
      const cause = new Error('Connection refused');
      const error = new RedcapNetworkError({ cause });

      expect(error.cause).toBe(cause);
      expect(error._tag).toBe('RedcapNetworkError');
    });

    it('should accept string cause', () => {
      const error = new RedcapNetworkError({ cause: 'DNS resolution failed' });

      expect(error.cause).toBe('DNS resolution failed');
    });

    it('should accept object cause', () => {
      const cause = { code: 'ECONNREFUSED', syscall: 'connect' };
      const error = new RedcapNetworkError({ cause });

      expect(error.cause).toEqual(cause);
    });

    it('should accept null cause', () => {
      const error = new RedcapNetworkError({ cause: null });

      expect(error.cause).toBeNull();
    });

    it('should be an instance of Error', () => {
      const error = new RedcapNetworkError({ cause: 'timeout' });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Error discrimination by _tag', () => {
    it('should distinguish between error types', () => {
      const httpError = new RedcapHttpError({ status: 500, message: 'Server Error' });
      const apiError = new RedcapApiError({ message: 'API Error' });
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
            return `API: ${error.message}`;
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
