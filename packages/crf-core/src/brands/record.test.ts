/**
 * @module brands/record.test
 * @description Tests for REDCap record ID branded type
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import { RecordId, RECORD_ID_PATTERN, isValidRecordId, parseRecordId } from './record.js';

describe('RecordId', () => {
  describe('RECORD_ID_PATTERN', () => {
    it('should match alphanumeric strings', () => {
      expect(RECORD_ID_PATTERN.test('1')).toBe(true);
      expect(RECORD_ID_PATTERN.test('123')).toBe(true);
      expect(RECORD_ID_PATTERN.test('abc')).toBe(true);
      expect(RECORD_ID_PATTERN.test('ABC')).toBe(true);
      expect(RECORD_ID_PATTERN.test('abc123')).toBe(true);
    });

    it('should match strings with underscores', () => {
      expect(RECORD_ID_PATTERN.test('record_1')).toBe(true);
      expect(RECORD_ID_PATTERN.test('my_record_id')).toBe(true);
      expect(RECORD_ID_PATTERN.test('_underscore')).toBe(true);
    });

    it('should match strings with hyphens', () => {
      expect(RECORD_ID_PATTERN.test('record-1')).toBe(true);
      expect(RECORD_ID_PATTERN.test('my-record-id')).toBe(true);
    });

    it('should match mixed alphanumeric with underscores and hyphens', () => {
      expect(RECORD_ID_PATTERN.test('my_record-123')).toBe(true);
      expect(RECORD_ID_PATTERN.test('ABC-123_def')).toBe(true);
    });

    it('should not match strings with special characters', () => {
      expect(RECORD_ID_PATTERN.test('record@1')).toBe(false);
      expect(RECORD_ID_PATTERN.test('record.1')).toBe(false);
      expect(RECORD_ID_PATTERN.test('record 1')).toBe(false);
      expect(RECORD_ID_PATTERN.test('record/1')).toBe(false);
    });

    it('should not match empty string', () => {
      // Note: pattern itself matches empty, but validator checks length
      expect(RECORD_ID_PATTERN.test('')).toBe(false);
    });
  });

  describe('RecordId validator', () => {
    it('should accept valid record IDs', () => {
      expect(() => RecordId('1')).not.toThrow();
      expect(() => RecordId('record_123')).not.toThrow();
      expect(() => RecordId('my-record')).not.toThrow();
    });

    it('should return the branded value', () => {
      const id = RecordId('record_1');
      expect(id).toBe('record_1');
    });

    it('should throw for invalid record IDs', () => {
      expect(() => RecordId('')).toThrow();
      expect(() => RecordId('record@1')).toThrow();
      expect(() => RecordId('record 1')).toThrow();
    });

    it('should throw BrandErrors for invalid record ID', () => {
      // Brand.refined throws BrandErrors which is an array-like structure
      expect(() => RecordId('invalid@id')).toThrow();
    });
  });

  describe('isValidRecordId', () => {
    it('should return true for valid record IDs', () => {
      expect(isValidRecordId('1')).toBe(true);
      expect(isValidRecordId('record_123')).toBe(true);
      expect(isValidRecordId('my-record')).toBe(true);
      expect(isValidRecordId('ABC_123-def')).toBe(true);
    });

    it('should return false for invalid record IDs', () => {
      expect(isValidRecordId('')).toBe(false);
      expect(isValidRecordId('record@1')).toBe(false);
      expect(isValidRecordId('record 1')).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = 'record_1';
      if (isValidRecordId(value)) {
        const _id: RecordId = value;
        expect(_id).toBe(value);
      }
    });
  });

  describe('parseRecordId', () => {
    it('should return Right for valid record IDs', () => {
      const result = parseRecordId('record_1');
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe('record_1');
      }
    });

    it('should return Left for invalid record IDs', () => {
      const result = parseRecordId('record@1');
      expect(Either.isLeft(result)).toBe(true);
    });

    it('should return Left for empty string', () => {
      const result = parseRecordId('');
      expect(Either.isLeft(result)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle numeric-only IDs', () => {
      expect(isValidRecordId('0')).toBe(true);
      expect(isValidRecordId('999999')).toBe(true);
    });

    it('should handle single character IDs', () => {
      expect(isValidRecordId('a')).toBe(true);
      expect(isValidRecordId('_')).toBe(true);
      expect(isValidRecordId('-')).toBe(true);
    });

    it('should handle very long IDs', () => {
      const longId = 'a'.repeat(1000);
      expect(isValidRecordId(longId)).toBe(true);
    });
  });
});
