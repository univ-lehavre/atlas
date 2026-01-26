/**
 * @module errors/http.test
 * @description Tests for REDCap HTTP errors
 */

import { describe, it, expect, vi } from 'vitest';
import { RedcapHttpError, fromResponse } from './http.js';

describe('RedcapHttpError', () => {
  describe('constructor', () => {
    it('should create error with status and statusText', () => {
      const error = new RedcapHttpError({ status: 404, statusText: 'Not Found' });
      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
    });

    it('should create error with optional body', () => {
      const error = new RedcapHttpError({
        status: 400,
        statusText: 'Bad Request',
        body: 'Invalid token',
      });
      expect(error.body).toBe('Invalid token');
    });

    it('should create error with optional url', () => {
      const error = new RedcapHttpError({
        status: 500,
        statusText: 'Internal Server Error',
        url: 'https://redcap.example.com/api/',
      });
      expect(error.url).toBe('https://redcap.example.com/api/');
    });
  });

  describe('message', () => {
    it('should format message without url', () => {
      const error = new RedcapHttpError({ status: 401, statusText: 'Unauthorized' });
      expect(error.message).toBe('HTTP 401 Unauthorized');
    });

    it('should format message with url', () => {
      const error = new RedcapHttpError({
        status: 403,
        statusText: 'Forbidden',
        url: 'https://redcap.example.com/api/',
      });
      expect(error.message).toBe('HTTP 403 Forbidden at https://redcap.example.com/api/');
    });
  });

  describe('_tag', () => {
    it('should have correct tag', () => {
      const error = new RedcapHttpError({ status: 404, statusText: 'Not Found' });
      expect(error._tag).toBe('RedcapHttpError');
    });
  });

  describe('isAuthError', () => {
    it('should return true for 401', () => {
      const error = new RedcapHttpError({ status: 401, statusText: 'Unauthorized' });
      expect(error.isAuthError).toBe(true);
    });

    it('should return true for 403', () => {
      const error = new RedcapHttpError({ status: 403, statusText: 'Forbidden' });
      expect(error.isAuthError).toBe(true);
    });

    it('should return false for other status codes', () => {
      expect(new RedcapHttpError({ status: 400, statusText: 'Bad Request' }).isAuthError).toBe(
        false
      );
      expect(new RedcapHttpError({ status: 404, statusText: 'Not Found' }).isAuthError).toBe(false);
      expect(
        new RedcapHttpError({ status: 500, statusText: 'Internal Server Error' }).isAuthError
      ).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for 429', () => {
      const error = new RedcapHttpError({ status: 429, statusText: 'Too Many Requests' });
      expect(error.isRateLimitError).toBe(true);
    });

    it('should return false for other status codes', () => {
      expect(new RedcapHttpError({ status: 400, statusText: 'Bad Request' }).isRateLimitError).toBe(
        false
      );
      expect(
        new RedcapHttpError({ status: 500, statusText: 'Internal Server Error' }).isRateLimitError
      ).toBe(false);
    });
  });

  describe('isServerError', () => {
    it('should return true for 5xx status codes', () => {
      expect(
        new RedcapHttpError({ status: 500, statusText: 'Internal Server Error' }).isServerError
      ).toBe(true);
      expect(new RedcapHttpError({ status: 502, statusText: 'Bad Gateway' }).isServerError).toBe(
        true
      );
      expect(
        new RedcapHttpError({ status: 503, statusText: 'Service Unavailable' }).isServerError
      ).toBe(true);
      expect(
        new RedcapHttpError({ status: 504, statusText: 'Gateway Timeout' }).isServerError
      ).toBe(true);
    });

    it('should return false for non-5xx status codes', () => {
      expect(new RedcapHttpError({ status: 400, statusText: 'Bad Request' }).isServerError).toBe(
        false
      );
      expect(new RedcapHttpError({ status: 404, statusText: 'Not Found' }).isServerError).toBe(
        false
      );
      expect(
        new RedcapHttpError({ status: 429, statusText: 'Too Many Requests' }).isServerError
      ).toBe(false);
    });
  });

  describe('isRetryable', () => {
    it('should return true for rate limit errors', () => {
      const error = new RedcapHttpError({ status: 429, statusText: 'Too Many Requests' });
      expect(error.isRetryable).toBe(true);
    });

    it('should return true for server errors', () => {
      expect(
        new RedcapHttpError({ status: 500, statusText: 'Internal Server Error' }).isRetryable
      ).toBe(true);
      expect(new RedcapHttpError({ status: 502, statusText: 'Bad Gateway' }).isRetryable).toBe(
        true
      );
      expect(
        new RedcapHttpError({ status: 503, statusText: 'Service Unavailable' }).isRetryable
      ).toBe(true);
    });

    it('should return false for client errors', () => {
      expect(new RedcapHttpError({ status: 400, statusText: 'Bad Request' }).isRetryable).toBe(
        false
      );
      expect(new RedcapHttpError({ status: 401, statusText: 'Unauthorized' }).isRetryable).toBe(
        false
      );
      expect(new RedcapHttpError({ status: 404, statusText: 'Not Found' }).isRetryable).toBe(false);
    });
  });
});

describe('fromResponse', () => {
  it('should create error from Response', async () => {
    const response = new Response('Error body', {
      status: 404,
      statusText: 'Not Found',
    });

    const error = await fromResponse(response);

    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.body).toBe('Error body');
  });

  it('should include url when provided', async () => {
    const response = new Response('', { status: 500, statusText: 'Internal Server Error' });

    const error = await fromResponse(response, 'https://redcap.example.com/api/');

    expect(error.url).toBe('https://redcap.example.com/api/');
  });

  it('should handle empty body', async () => {
    const response = new Response('', { status: 401, statusText: 'Unauthorized' });

    const error = await fromResponse(response);

    expect(error.body).toBe('');
  });

  it('should handle body read failure', async () => {
    const response = {
      status: 500,
      statusText: 'Internal Server Error',
      text: vi.fn().mockRejectedValue(new Error('Read failed')),
    } as unknown as Response;

    const error = await fromResponse(response);

    expect(error.body).toBeUndefined();
  });
});
