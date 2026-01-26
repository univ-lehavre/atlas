/**
 * @module errors/network.test
 * @description Tests for REDCap network errors
 */

import { describe, it, expect } from 'vitest';
import { RedcapNetworkError, fromException } from './network.js';

describe('RedcapNetworkError', () => {
  describe('constructor', () => {
    it('should create error with cause', () => {
      const cause = new Error('Connection failed');
      const error = new RedcapNetworkError({ cause });
      expect(error.cause).toBe(cause);
    });

    it('should create error with string cause', () => {
      const error = new RedcapNetworkError({ cause: 'ECONNREFUSED' });
      expect(error.cause).toBe('ECONNREFUSED');
    });

    it('should create error with optional url', () => {
      const error = new RedcapNetworkError({
        cause: new Error('Timeout'),
        url: 'https://redcap.example.com/api/',
      });
      expect(error.url).toBe('https://redcap.example.com/api/');
    });
  });

  describe('message', () => {
    it('should format message with Error cause', () => {
      const error = new RedcapNetworkError({ cause: new Error('Connection refused') });
      expect(error.message).toBe('Network error: Connection refused');
    });

    it('should format message with string cause', () => {
      const error = new RedcapNetworkError({ cause: 'ECONNREFUSED' });
      expect(error.message).toBe('Network error: ECONNREFUSED');
    });

    it('should include url in message', () => {
      const error = new RedcapNetworkError({
        cause: new Error('Timeout'),
        url: 'https://redcap.example.com/api/',
      });
      expect(error.message).toBe('Network error at https://redcap.example.com/api/: Timeout');
    });
  });

  describe('_tag', () => {
    it('should have correct tag', () => {
      const error = new RedcapNetworkError({ cause: 'test' });
      expect(error._tag).toBe('RedcapNetworkError');
    });
  });

  describe('isTimeout', () => {
    it('should return true for TimeoutError', () => {
      const cause = new Error('Request timed out');
      cause.name = 'TimeoutError';
      const error = new RedcapNetworkError({ cause });
      expect(error.isTimeout).toBe(true);
    });

    it('should return true for timeout message', () => {
      expect(new RedcapNetworkError({ cause: new Error('Request timeout') }).isTimeout).toBe(true);
      expect(new RedcapNetworkError({ cause: new Error('Connection timed out') }).isTimeout).toBe(
        true
      );
      expect(
        new RedcapNetworkError({ cause: new Error('Socket timeout exceeded') }).isTimeout
      ).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(new RedcapNetworkError({ cause: new Error('TIMEOUT') }).isTimeout).toBe(true);
      expect(new RedcapNetworkError({ cause: new Error('TIMED OUT') }).isTimeout).toBe(true);
    });

    it('should return false for non-Error cause', () => {
      expect(new RedcapNetworkError({ cause: 'timeout' }).isTimeout).toBe(false);
    });

    it('should return false for non-timeout errors', () => {
      expect(new RedcapNetworkError({ cause: new Error('Connection refused') }).isTimeout).toBe(
        false
      );
    });
  });

  describe('isDnsError', () => {
    it('should return true for getaddrinfo errors', () => {
      const error = new RedcapNetworkError({
        cause: new Error('getaddrinfo ENOTFOUND example.com'),
      });
      expect(error.isDnsError).toBe(true);
    });

    it('should return true for DNS errors', () => {
      expect(new RedcapNetworkError({ cause: new Error('DNS lookup failed') }).isDnsError).toBe(
        true
      );
      expect(new RedcapNetworkError({ cause: new Error('dns resolution error') }).isDnsError).toBe(
        true
      );
    });

    it('should return true for ENOTFOUND errors', () => {
      expect(new RedcapNetworkError({ cause: new Error('ENOTFOUND') }).isDnsError).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(new RedcapNetworkError({ cause: new Error('GETADDRINFO failed') }).isDnsError).toBe(
        true
      );
    });

    it('should return false for non-Error cause', () => {
      expect(new RedcapNetworkError({ cause: 'ENOTFOUND' }).isDnsError).toBe(false);
    });

    it('should return false for non-DNS errors', () => {
      expect(new RedcapNetworkError({ cause: new Error('Connection refused') }).isDnsError).toBe(
        false
      );
    });
  });

  describe('isConnectionRefused', () => {
    it('should return true for ECONNREFUSED', () => {
      expect(
        new RedcapNetworkError({ cause: new Error('connect ECONNREFUSED 127.0.0.1:443') })
          .isConnectionRefused
      ).toBe(true);
    });

    it('should return true for connection refused message', () => {
      expect(
        new RedcapNetworkError({ cause: new Error('Connection refused') }).isConnectionRefused
      ).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(
        new RedcapNetworkError({ cause: new Error('connection refused') }).isConnectionRefused
      ).toBe(true);
      expect(new RedcapNetworkError({ cause: new Error('ECONNREFUSED') }).isConnectionRefused).toBe(
        true
      );
    });

    it('should return false for non-Error cause', () => {
      expect(new RedcapNetworkError({ cause: 'ECONNREFUSED' }).isConnectionRefused).toBe(false);
    });

    it('should return false for other connection errors', () => {
      expect(
        new RedcapNetworkError({ cause: new Error('Connection reset') }).isConnectionRefused
      ).toBe(false);
    });
  });

  describe('isRetryable', () => {
    it('should return true for timeout errors', () => {
      const cause = new Error('Request timed out');
      cause.name = 'TimeoutError';
      expect(new RedcapNetworkError({ cause }).isRetryable).toBe(true);
    });

    it('should return true for connection refused errors', () => {
      expect(new RedcapNetworkError({ cause: new Error('ECONNREFUSED') }).isRetryable).toBe(true);
    });

    it('should return false for DNS errors', () => {
      expect(
        new RedcapNetworkError({ cause: new Error('getaddrinfo ENOTFOUND') }).isRetryable
      ).toBe(false);
    });

    it('should return false for other errors', () => {
      expect(new RedcapNetworkError({ cause: new Error('Unknown error') }).isRetryable).toBe(false);
    });
  });
});

describe('fromException', () => {
  it('should create error from Error', () => {
    const cause = new Error('Test error');
    const error = fromException(cause);
    expect(error.cause).toBe(cause);
    expect(error._tag).toBe('RedcapNetworkError');
  });

  it('should create error from string', () => {
    const error = fromException('Connection failed');
    expect(error.cause).toBe('Connection failed');
  });

  it('should include url when provided', () => {
    const error = fromException(new Error('Test'), 'https://redcap.example.com/api/');
    expect(error.url).toBe('https://redcap.example.com/api/');
  });

  it('should handle undefined/null cause', () => {
    expect(() => fromException(undefined)).not.toThrow();
    expect(() => fromException(null)).not.toThrow();
  });
});
