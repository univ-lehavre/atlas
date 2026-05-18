/**
 * @module errors/api.test
 * @description Tests for REDCap API errors
 */

import { describe, it, expect } from 'vitest';
import { CrfApiError, parseApiError, isApiErrorResponse } from './api.js';

describe('CrfApiError', () => {
  describe('constructor', () => {
    it('should create error with error message', () => {
      const error = new CrfApiError({ error: 'Invalid token' });
      expect(error.error).toBe('Invalid token');
    });

    it('should create error with optional code', () => {
      const error = new CrfApiError({ error: 'User not found', code: 'user_not_found' });
      expect(error.error).toBe('User not found');
      expect(error.code).toBe('user_not_found');
    });
  });

  describe('message', () => {
    it('should format message without code', () => {
      const error = new CrfApiError({ error: 'Invalid token' });
      expect(error.message).toBe('Invalid token');
    });

    it('should format message with code', () => {
      const error = new CrfApiError({ error: 'User not found', code: 'user_not_found' });
      expect(error.message).toBe('[user_not_found] User not found');
    });
  });

  describe('_tag', () => {
    it('should have correct tag', () => {
      const error = new CrfApiError({ error: 'Test error' });
      expect(error._tag).toBe('CrfApiError');
    });
  });

  describe('isInvalidToken', () => {
    it('should return true for invalid token messages', () => {
      expect(new CrfApiError({ error: 'Invalid token' }).isInvalidToken).toBe(true);
      expect(new CrfApiError({ error: 'invalid token format' }).isInvalidToken).toBe(true);
      expect(new CrfApiError({ error: 'The API token is invalid' }).isInvalidToken).toBe(true);
    });

    it('should return true for api token messages', () => {
      expect(new CrfApiError({ error: 'API token not provided' }).isInvalidToken).toBe(true);
      expect(new CrfApiError({ error: 'Bad api token' }).isInvalidToken).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(new CrfApiError({ error: 'INVALID TOKEN' }).isInvalidToken).toBe(true);
      expect(new CrfApiError({ error: 'API TOKEN error' }).isInvalidToken).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(new CrfApiError({ error: 'Record not found' }).isInvalidToken).toBe(false);
      expect(new CrfApiError({ error: 'Permission denied' }).isInvalidToken).toBe(false);
    });
  });

  describe('isPermissionError', () => {
    it('should return true for permission messages', () => {
      expect(new CrfApiError({ error: 'Permission denied' }).isPermissionError).toBe(true);
      expect(new CrfApiError({ error: 'You do not have permission' }).isPermissionError).toBe(true);
    });

    it('should return true for authorization messages', () => {
      expect(new CrfApiError({ error: 'Not authorized' }).isPermissionError).toBe(true);
      expect(
        new CrfApiError({ error: 'You are not authorized to access this' }).isPermissionError
      ).toBe(true);
    });

    it('should return true for access denied messages', () => {
      expect(new CrfApiError({ error: 'Access denied' }).isPermissionError).toBe(true);
      // Note: "Access is denied" doesn't match "access denied" substring
      expect(new CrfApiError({ error: 'User access denied' }).isPermissionError).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(new CrfApiError({ error: 'PERMISSION DENIED' }).isPermissionError).toBe(true);
      expect(new CrfApiError({ error: 'NOT AUTHORIZED' }).isPermissionError).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(new CrfApiError({ error: 'Invalid token' }).isPermissionError).toBe(false);
      expect(new CrfApiError({ error: 'Record not found' }).isPermissionError).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for invalid messages', () => {
      expect(new CrfApiError({ error: 'Invalid record format' }).isValidationError).toBe(true);
      expect(new CrfApiError({ error: 'Field value is invalid' }).isValidationError).toBe(true);
    });

    it('should return true for required messages', () => {
      expect(new CrfApiError({ error: 'Field is required' }).isValidationError).toBe(true);
      expect(new CrfApiError({ error: 'Required parameter missing' }).isValidationError).toBe(true);
    });

    it('should return true for must be messages', () => {
      expect(new CrfApiError({ error: 'Value must be a number' }).isValidationError).toBe(true);
      expect(
        new CrfApiError({ error: 'Date must be in format YYYY-MM-DD' }).isValidationError
      ).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(new CrfApiError({ error: 'INVALID FORMAT' }).isValidationError).toBe(true);
      expect(new CrfApiError({ error: 'REQUIRED FIELD' }).isValidationError).toBe(true);
    });

    it('should return false for non-validation errors', () => {
      expect(new CrfApiError({ error: 'Record not found' }).isValidationError).toBe(false);
      expect(new CrfApiError({ error: 'Server error' }).isValidationError).toBe(false);
    });
  });
});

describe('parseApiError', () => {
  it('should parse object with error field', () => {
    const error = parseApiError({ error: 'Test error' });
    expect(error).not.toBeNull();
    expect(error?.error).toBe('Test error');
  });

  it('should parse object with error and code fields', () => {
    const error = parseApiError({ error: 'User not found', code: 'user_not_found' });
    expect(error).not.toBeNull();
    expect(error?.error).toBe('User not found');
    expect(error?.code).toBe('user_not_found');
  });

  it('should convert non-string error to string', () => {
    const error = parseApiError({ error: 123 });
    expect(error).not.toBeNull();
    expect(error?.error).toBe('123');
  });

  it('should convert non-string code to string', () => {
    const error = parseApiError({ error: 'Test', code: 456 });
    expect(error?.code).toBe('456');
  });

  it('should return null for non-object', () => {
    expect(parseApiError('string')).toBeNull();
    expect(parseApiError(123)).toBeNull();
    expect(parseApiError(null)).toBeNull();
    expect(parseApiError(undefined)).toBeNull();
  });

  it('should return null for object without error field', () => {
    expect(parseApiError({ message: 'Test' })).toBeNull();
    expect(parseApiError({})).toBeNull();
  });

  it('should return null for array', () => {
    expect(parseApiError(['error'])).toBeNull();
  });
});

describe('isApiErrorResponse', () => {
  it('should return true for object with error field', () => {
    expect(isApiErrorResponse({ error: 'Test' })).toBe(true);
    expect(isApiErrorResponse({ error: 'Test', code: '123' })).toBe(true);
    expect(isApiErrorResponse({ error: 'Test', extra: 'field' })).toBe(true);
  });

  it('should return false for non-object', () => {
    expect(isApiErrorResponse('string')).toBe(false);
    expect(isApiErrorResponse(123)).toBe(false);
    expect(isApiErrorResponse(null)).toBe(false);
    expect(isApiErrorResponse(undefined)).toBe(false);
  });

  it('should return false for object without error field', () => {
    expect(isApiErrorResponse({ message: 'Test' })).toBe(false);
    expect(isApiErrorResponse({})).toBe(false);
  });

  it('should return false for array', () => {
    expect(isApiErrorResponse(['error'])).toBe(false);
    expect(isApiErrorResponse([{ error: 'test' }])).toBe(false);
  });
});
