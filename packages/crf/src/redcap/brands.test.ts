import { describe, it, expect } from 'vitest';
import {
  RedcapToken,
  RecordId,
  InstrumentName,
  Email,
  UserId,
  PositiveInt,
  NonEmptyString,
  IsoTimestamp,
  toBooleanFlag,
  fromBooleanFlag,
} from './brands.js';
import type { BooleanFlag } from './brands.js';

describe('Branded Types', () => {
  describe('RedcapToken', () => {
    it('should accept valid 32-character uppercase hex token', () => {
      expect(() => RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).not.toThrow();
      expect(() => RedcapToken('0123456789ABCDEF0123456789ABCDEF')).not.toThrow();
    });

    it('should reject lowercase hex token', () => {
      expect(() => RedcapToken('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toThrow();
    });

    it('should reject mixed case hex token', () => {
      expect(() => RedcapToken('AAAAAAAAAAAAAAAAaaaaaaaaaaaaaaaa')).toThrow();
    });

    it('should reject token with wrong length (too short)', () => {
      expect(() => RedcapToken('AABBCCDD')).toThrow();
    });

    it('should reject token with wrong length (too long)', () => {
      expect(() => RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABB')).toThrow();
    });

    it('should reject token with invalid characters', () => {
      expect(() => RedcapToken('GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toThrow();
      expect(() => RedcapToken('AAAAAAAAAAAAAAAA!@#$%^&*()AAAAAA')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => RedcapToken('')).toThrow();
    });
  });

  describe('RecordId', () => {
    it('should accept alphanumeric record IDs', () => {
      expect(() => RecordId('1')).not.toThrow();
      expect(() => RecordId('record123')).not.toThrow();
      expect(() => RecordId('abc_123')).not.toThrow();
    });

    it('should accept record IDs with hyphens and underscores', () => {
      expect(() => RecordId('record-123')).not.toThrow();
      expect(() => RecordId('record_123')).not.toThrow();
      expect(() => RecordId('my-record_id-123')).not.toThrow();
    });

    it('should accept uppercase characters', () => {
      expect(() => RecordId('RECORD123')).not.toThrow();
      expect(() => RecordId('Record_123')).not.toThrow();
    });

    it('should reject special characters other than underscore and hyphen', () => {
      expect(() => RecordId('record@123')).toThrow();
      expect(() => RecordId('record 123')).toThrow();
      expect(() => RecordId('record.123')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => RecordId('')).toThrow();
    });
  });

  describe('InstrumentName', () => {
    it('should accept valid instrument name starting with lowercase letter', () => {
      expect(() => InstrumentName('survey')).not.toThrow();
      expect(() => InstrumentName('my_instrument_123')).not.toThrow();
      expect(() => InstrumentName('a')).not.toThrow();
    });

    it('should reject name starting with number', () => {
      expect(() => InstrumentName('1survey')).toThrow();
    });

    it('should reject name starting with underscore', () => {
      expect(() => InstrumentName('_survey')).toThrow();
    });

    it('should reject uppercase letters', () => {
      expect(() => InstrumentName('Survey')).toThrow();
      expect(() => InstrumentName('SURVEY')).toThrow();
    });

    it('should reject hyphens', () => {
      expect(() => InstrumentName('my-instrument')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => InstrumentName('')).toThrow();
    });
  });

  describe('Email', () => {
    it('should accept valid email addresses', () => {
      expect(() => Email('user@example.com')).not.toThrow();
      expect(() => Email('test.user@domain.org')).not.toThrow();
      expect(() => Email('a@b.co')).not.toThrow();
    });

    it('should reject email without @', () => {
      expect(() => Email('userexample.com')).toThrow();
    });

    it('should reject email without domain', () => {
      expect(() => Email('user@')).toThrow();
    });

    it('should reject email without TLD', () => {
      expect(() => Email('user@domain')).toThrow();
    });

    it('should reject email with spaces', () => {
      expect(() => Email('user @example.com')).toThrow();
      expect(() => Email('user@ example.com')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => Email('')).toThrow();
    });
  });

  describe('UserId', () => {
    it('should accept valid alphanumeric user IDs', () => {
      expect(() => UserId('user123')).not.toThrow();
      expect(() => UserId('john_doe')).not.toThrow();
      expect(() => UserId('a')).not.toThrow();
    });

    it('should reject user ID with hyphens', () => {
      expect(() => UserId('user-123')).toThrow();
    });

    it('should reject user ID with special characters', () => {
      expect(() => UserId('user@123')).toThrow();
      expect(() => UserId('user.name')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => UserId('')).toThrow();
    });
  });

  describe('PositiveInt', () => {
    it('should accept positive integers', () => {
      expect(() => PositiveInt(1)).not.toThrow();
      expect(() => PositiveInt(100)).not.toThrow();
      expect(() => PositiveInt(999_999)).not.toThrow();
    });

    it('should reject zero', () => {
      expect(() => PositiveInt(0)).toThrow();
    });

    it('should reject negative integers', () => {
      expect(() => PositiveInt(-1)).toThrow();
      expect(() => PositiveInt(-100)).toThrow();
    });

    it('should reject floating point numbers', () => {
      expect(() => PositiveInt(1.5)).toThrow();
      expect(() => PositiveInt(3.14)).toThrow();
    });

    it('should reject NaN', () => {
      expect(() => PositiveInt(Number.NaN)).toThrow();
    });
  });

  describe('NonEmptyString', () => {
    it('should accept non-empty strings', () => {
      expect(() => NonEmptyString('hello')).not.toThrow();
      expect(() => NonEmptyString(' ')).not.toThrow(); // whitespace is not empty
      expect(() => NonEmptyString('a')).not.toThrow();
    });

    it('should reject empty string', () => {
      expect(() => NonEmptyString('')).toThrow();
    });
  });

  describe('IsoTimestamp', () => {
    it('should accept valid ISO 8601 date', () => {
      expect(() => IsoTimestamp('2024-01-15')).not.toThrow();
    });

    it('should accept valid ISO 8601 datetime with T separator', () => {
      expect(() => IsoTimestamp('2024-01-15T10:30:00')).not.toThrow();
    });

    it('should accept valid ISO 8601 datetime with space separator', () => {
      expect(() => IsoTimestamp('2024-01-15 10:30:00')).not.toThrow();
    });

    it('should accept valid ISO 8601 datetime without seconds', () => {
      expect(() => IsoTimestamp('2024-01-15 10:30')).not.toThrow();
      expect(() => IsoTimestamp('2024-01-15T10:30')).not.toThrow();
    });

    it('should reject invalid date format', () => {
      expect(() => IsoTimestamp('01/15/2024')).toThrow();
      expect(() => IsoTimestamp('15-01-2024')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => IsoTimestamp('')).toThrow();
    });
  });

  describe('BooleanFlag utilities', () => {
    it('toBooleanFlag should convert true to 1', () => {
      const result: BooleanFlag = toBooleanFlag(true);
      expect(result).toBe(1);
    });

    it('toBooleanFlag should convert false to 0', () => {
      const result: BooleanFlag = toBooleanFlag(false);
      expect(result).toBe(0);
    });

    it('fromBooleanFlag should convert 1 to true', () => {
      expect(fromBooleanFlag(1)).toBe(true);
    });

    it('fromBooleanFlag should convert 0 to false', () => {
      expect(fromBooleanFlag(0)).toBe(false);
    });
  });
});
