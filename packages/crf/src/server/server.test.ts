import { describe, it, expect, vi } from 'vitest';
import { validationErrorHook } from './middleware/validation.js';
import {
  ErrorResponseSchema,
  REDCAP_NAME_PATTERN,
  INSTRUMENT_NAME_PATTERN,
  RECORD_ID_PATTERN,
  EMAIL_PATTERN,
} from './schemas.js';

/**
 * Server module tests (middleware, schemas)
 *
 * Note: Route tests that import the redcap client are excluded because they
 * require environment variables. Routes are tested through integration tests.
 */

describe('Server Module', () => {
  describe('Validation Error Hook', () => {
    it('should return undefined for successful validation', () => {
      const mockContext = {
        json: vi.fn().mockReturnValue(new Response()),
      };

      const result = validationErrorHook(
        { success: true },
        mockContext as unknown as Parameters<typeof validationErrorHook>[1]
      );

      expect(result).toBeUndefined();
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should return JSON error response for failed validation', () => {
      const mockResponse = new Response();
      const mockContext = {
        json: vi.fn().mockReturnValue(mockResponse),
      };

      const result = validationErrorHook(
        {
          success: false,
          error: [{ message: 'Invalid field' }, { message: 'Missing required field' }],
        },
        mockContext as unknown as Parameters<typeof validationErrorHook>[1]
      );

      expect(result).toBe(mockResponse);
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          data: null,
          error: {
            code: 'validation_error',
            message: 'Invalid field, Missing required field',
          },
        },
        400
      );
    });

    it('should handle empty error array', () => {
      const mockContext = {
        json: vi.fn().mockReturnValue(new Response()),
      };

      validationErrorHook(
        { success: false, error: [] },
        mockContext as unknown as Parameters<typeof validationErrorHook>[1]
      );

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          data: null,
          error: {
            code: 'validation_error',
            message: '',
          },
        },
        400
      );
    });

    it('should handle undefined error array', () => {
      const mockContext = {
        json: vi.fn().mockReturnValue(new Response()),
      };

      validationErrorHook(
        { success: false },
        mockContext as unknown as Parameters<typeof validationErrorHook>[1]
      );

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          data: null,
          error: {
            code: 'validation_error',
            message: 'Validation failed',
          },
        },
        400
      );
    });
  });

  describe('Schema Patterns', () => {
    describe('REDCAP_NAME_PATTERN', () => {
      it('should match valid REDCap field names', () => {
        expect(REDCAP_NAME_PATTERN.test('field_name')).toBe(true);
        expect(REDCAP_NAME_PATTERN.test('record_id')).toBe(true);
        expect(REDCAP_NAME_PATTERN.test('field1,field2')).toBe(true);
        expect(REDCAP_NAME_PATTERN.test('abc123')).toBe(true);
        expect(REDCAP_NAME_PATTERN.test('')).toBe(true); // Empty is valid (optional)
      });

      it('should reject invalid characters', () => {
        expect(REDCAP_NAME_PATTERN.test('field-name')).toBe(false);
        expect(REDCAP_NAME_PATTERN.test('field.name')).toBe(false);
        expect(REDCAP_NAME_PATTERN.test('field name')).toBe(false);
        expect(REDCAP_NAME_PATTERN.test('field@name')).toBe(false);
      });
    });

    describe('INSTRUMENT_NAME_PATTERN', () => {
      it('should match valid instrument names', () => {
        expect(INSTRUMENT_NAME_PATTERN.test('survey')).toBe(true);
        expect(INSTRUMENT_NAME_PATTERN.test('demographics')).toBe(true);
        expect(INSTRUMENT_NAME_PATTERN.test('form_1')).toBe(true);
        expect(INSTRUMENT_NAME_PATTERN.test('a')).toBe(true);
        expect(INSTRUMENT_NAME_PATTERN.test('survey123')).toBe(true);
      });

      it('should reject invalid instrument names', () => {
        expect(INSTRUMENT_NAME_PATTERN.test('Survey')).toBe(false); // Uppercase
        expect(INSTRUMENT_NAME_PATTERN.test('1survey')).toBe(false); // Starts with number
        expect(INSTRUMENT_NAME_PATTERN.test('_survey')).toBe(false); // Starts with underscore
        expect(INSTRUMENT_NAME_PATTERN.test('sur-vey')).toBe(false); // Contains hyphen
        expect(INSTRUMENT_NAME_PATTERN.test('')).toBe(false); // Empty
      });
    });

    describe('RECORD_ID_PATTERN', () => {
      it('should match valid record IDs (20+ alphanumeric)', () => {
        expect(RECORD_ID_PATTERN.test('abcdefghij0123456789')).toBe(true);
        expect(RECORD_ID_PATTERN.test('record12345678901234567890')).toBe(true);
        expect(RECORD_ID_PATTERN.test('ABCDEFGHIJ0123456789')).toBe(true); // Case insensitive
      });

      it('should reject invalid record IDs', () => {
        expect(RECORD_ID_PATTERN.test('short')).toBe(false); // Too short
        expect(RECORD_ID_PATTERN.test('abcdefghij012345678')).toBe(false); // 19 chars
        expect(RECORD_ID_PATTERN.test('abcdefghij_123456789')).toBe(false); // Contains underscore
        expect(RECORD_ID_PATTERN.test('')).toBe(false); // Empty
      });
    });

    describe('EMAIL_PATTERN', () => {
      it('should match valid email addresses', () => {
        expect(EMAIL_PATTERN.test('user@example.com')).toBe(true);
        expect(EMAIL_PATTERN.test('test.user@domain.org')).toBe(true);
        expect(EMAIL_PATTERN.test('a@b.co')).toBe(true);
        expect(EMAIL_PATTERN.test('user+tag@example.com')).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(EMAIL_PATTERN.test('userexample.com')).toBe(false); // No @
        expect(EMAIL_PATTERN.test('user@')).toBe(false); // No domain
        expect(EMAIL_PATTERN.test('@example.com')).toBe(false); // No local part
        expect(EMAIL_PATTERN.test('user@domain')).toBe(false); // No TLD
        expect(EMAIL_PATTERN.test('user @example.com')).toBe(false); // Space
        expect(EMAIL_PATTERN.test('')).toBe(false); // Empty
      });
    });
  });

  describe('Error Response Schema', () => {
    it('should be a valid Effect schema', () => {
      expect(ErrorResponseSchema).toBeDefined();
    });
  });
});
