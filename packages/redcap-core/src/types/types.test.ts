/**
 * @module types/types.test
 * @description Tests for REDCap response type guards
 */

import { describe, it, expect } from 'vitest';
import { isErrorResponse, type ErrorResponse } from './responses.js';

describe('isErrorResponse', () => {
  describe('valid error responses', () => {
    it('should return true for error with message only', () => {
      const response: ErrorResponse = { error: 'Invalid token' };
      expect(isErrorResponse(response)).toBe(true);
    });

    it('should return true for error with code', () => {
      const response: ErrorResponse = { error: 'Permission denied', code: '403' };
      expect(isErrorResponse(response)).toBe(true);
    });

    it('should return true for error with empty message', () => {
      const response = { error: '' };
      expect(isErrorResponse(response)).toBe(true);
    });

    it('should return true for object with error and other fields', () => {
      const response = { error: 'Something went wrong', extra: 'data' };
      expect(isErrorResponse(response)).toBe(true);
    });
  });

  describe('non-error responses', () => {
    it('should return false for null', () => {
      expect(isErrorResponse(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isErrorResponse(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isErrorResponse('error')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isErrorResponse(500)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isErrorResponse(['error'])).toBe(false);
      expect(isErrorResponse([{ error: 'test' }])).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isErrorResponse({})).toBe(false);
    });

    it('should return false for object without error field', () => {
      expect(isErrorResponse({ message: 'test' })).toBe(false);
      expect(isErrorResponse({ code: '500' })).toBe(false);
    });

    it('should return false for successful responses', () => {
      // Count response
      expect(isErrorResponse({ count: 10 })).toBe(false);

      // IDs response
      expect(isErrorResponse({ ids: ['1', '2'] })).toBe(false);

      // File info response
      expect(isErrorResponse({ doc_id: 1, doc_name: 'test.pdf', doc_size: 1024 })).toBe(false);

      // Survey link response
      expect(isErrorResponse({ survey_link: 'https://example.com' })).toBe(false);
    });
  });

  describe('type narrowing', () => {
    it('should narrow type correctly', () => {
      const response: unknown = { error: 'Test error', code: '400' };

      if (isErrorResponse(response)) {
        // TypeScript should now know this is ErrorResponse
        expect(response.error).toBe('Test error');
        expect(response.code).toBe('400');
      } else {
        // This branch should not execute
        expect.fail('Should have been an error response');
      }
    });

    it('should work with union types', () => {
      type ApiResponse = ErrorResponse | { data: string };

      const errorResponse: ApiResponse = { error: 'Failed' };
      const successResponse: ApiResponse = { data: 'Success' };

      expect(isErrorResponse(errorResponse)).toBe(true);
      expect(isErrorResponse(successResponse)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return true when error is null (valid JS object with error key)', () => {
      // This is technically valid since 'error' key exists
      const response = { error: null };
      expect(isErrorResponse(response)).toBe(true);
    });

    it('should return true when error is undefined (key exists)', () => {
      const response = { error: undefined };
      expect(isErrorResponse(response)).toBe(true);
    });

    it('should return false for function', () => {
      expect(isErrorResponse(() => {})).toBe(false);
    });

    it('should return false for class instance without error', () => {
      class MyClass {
        message = 'test';
      }
      expect(isErrorResponse(new MyClass())).toBe(false);
    });

    it('should return true for class instance with error property', () => {
      class ErrorClass {
        error = 'test error';
      }
      expect(isErrorResponse(new ErrorClass())).toBe(true);
    });
  });
});
