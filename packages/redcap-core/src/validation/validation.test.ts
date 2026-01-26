/**
 * @module validation/validation.test
 * @description Tests for validation functions and patterns
 */

import { describe, it, expect } from 'vitest';
import {
  TOKEN_PATTERN,
  REDCAP_NAME_PATTERN,
  RECORD_ID_PATTERN,
  EMAIL_PATTERN,
  VERSION_PATTERN,
  DATE_PATTERN,
  DATETIME_PATTERN,
  TIME_PATTERN,
  INTEGER_PATTERN,
  NUMBER_PATTERN,
  URL_PATTERN,
  PHONE_PATTERN,
  ZIPCODE_PATTERN,
} from './patterns.js';
import {
  isValidToken,
  isValidRedcapName,
  isValidRecordId,
  isValidEmail,
  isValidVersion,
  isValidDate,
  isValidDatetime,
  isValidTime,
  isValidInteger,
  isValidNumber,
  isValidUrl,
  isInRange,
  isValidLength,
} from './validators.js';

describe('Patterns', () => {
  describe('TOKEN_PATTERN', () => {
    it('should match 32 uppercase hex characters', () => {
      expect(TOKEN_PATTERN.test('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
      expect(TOKEN_PATTERN.test('0123456789ABCDEF0123456789ABCDEF')).toBe(true);
    });

    it('should not match lowercase', () => {
      expect(TOKEN_PATTERN.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
    });

    it('should not match wrong length', () => {
      expect(TOKEN_PATTERN.test('AAAA')).toBe(false);
    });
  });

  describe('REDCAP_NAME_PATTERN', () => {
    it('should match valid REDCap names', () => {
      expect(REDCAP_NAME_PATTERN.test('record_id')).toBe(true);
      expect(REDCAP_NAME_PATTERN.test('survey1')).toBe(true);
    });

    it('should not match uppercase', () => {
      expect(REDCAP_NAME_PATTERN.test('Record_Id')).toBe(false);
    });

    it('should not match starting with number', () => {
      expect(REDCAP_NAME_PATTERN.test('1record')).toBe(false);
    });
  });

  describe('DATE_PATTERN', () => {
    it('should match YYYY-MM-DD', () => {
      expect(DATE_PATTERN.test('2024-01-15')).toBe(true);
      expect(DATE_PATTERN.test('2000-12-31')).toBe(true);
    });

    it('should not match other formats', () => {
      expect(DATE_PATTERN.test('01/15/2024')).toBe(false);
      expect(DATE_PATTERN.test('2024-1-15')).toBe(false);
    });
  });

  describe('DATETIME_PATTERN', () => {
    it('should match YYYY-MM-DD HH:MM', () => {
      expect(DATETIME_PATTERN.test('2024-01-15 10:30')).toBe(true);
    });

    it('should match YYYY-MM-DD HH:MM:SS', () => {
      expect(DATETIME_PATTERN.test('2024-01-15 10:30:45')).toBe(true);
    });

    it('should not match T separator', () => {
      expect(DATETIME_PATTERN.test('2024-01-15T10:30:00')).toBe(false);
    });
  });

  describe('TIME_PATTERN', () => {
    it('should match HH:MM', () => {
      expect(TIME_PATTERN.test('10:30')).toBe(true);
      expect(TIME_PATTERN.test('23:59')).toBe(true);
    });

    it('should match HH:MM:SS', () => {
      expect(TIME_PATTERN.test('10:30:45')).toBe(true);
    });
  });

  describe('INTEGER_PATTERN', () => {
    it('should match integers', () => {
      expect(INTEGER_PATTERN.test('123')).toBe(true);
      expect(INTEGER_PATTERN.test('-456')).toBe(true);
      expect(INTEGER_PATTERN.test('0')).toBe(true);
    });

    it('should not match decimals', () => {
      expect(INTEGER_PATTERN.test('12.34')).toBe(false);
    });
  });

  describe('NUMBER_PATTERN', () => {
    it('should match integers and decimals', () => {
      expect(NUMBER_PATTERN.test('123')).toBe(true);
      expect(NUMBER_PATTERN.test('-456')).toBe(true);
      expect(NUMBER_PATTERN.test('12.34')).toBe(true);
      expect(NUMBER_PATTERN.test('-12.34')).toBe(true);
    });

    it('should not match invalid numbers', () => {
      expect(NUMBER_PATTERN.test('12.34.56')).toBe(false);
      expect(NUMBER_PATTERN.test('abc')).toBe(false);
    });
  });

  describe('URL_PATTERN', () => {
    it('should match http/https URLs', () => {
      expect(URL_PATTERN.test('http://example.com')).toBe(true);
      expect(URL_PATTERN.test('https://redcap.example.com/api/')).toBe(true);
    });

    it('should not match other schemes', () => {
      expect(URL_PATTERN.test('ftp://example.com')).toBe(false);
    });
  });

  describe('PHONE_PATTERN', () => {
    it('should match phone numbers', () => {
      expect(PHONE_PATTERN.test('+1 (555) 123-4567')).toBe(true);
      expect(PHONE_PATTERN.test('555-123-4567')).toBe(true);
    });
  });

  describe('ZIPCODE_PATTERN', () => {
    it('should match 5-digit ZIP', () => {
      expect(ZIPCODE_PATTERN.test('12345')).toBe(true);
    });

    it('should match ZIP+4', () => {
      expect(ZIPCODE_PATTERN.test('12345-6789')).toBe(true);
    });
  });
});

describe('Validators', () => {
  describe('isValidToken', () => {
    it('should validate tokens', () => {
      expect(isValidToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
      expect(isValidToken('invalid')).toBe(false);
    });
  });

  describe('isValidRedcapName', () => {
    it('should validate REDCap names', () => {
      expect(isValidRedcapName('record_id')).toBe(true);
      expect(isValidRedcapName('Record_ID')).toBe(false);
    });
  });

  describe('isValidRecordId', () => {
    it('should validate record IDs', () => {
      expect(isValidRecordId('1')).toBe(true);
      expect(isValidRecordId('record-123')).toBe(true);
      expect(isValidRecordId('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
    });
  });

  describe('isValidVersion', () => {
    it('should validate versions', () => {
      expect(isValidVersion('14.5.10')).toBe(true);
      expect(isValidVersion('invalid')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should validate dates', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('01/15/2024')).toBe(false);
    });
  });

  describe('isValidDatetime', () => {
    it('should validate datetimes', () => {
      expect(isValidDatetime('2024-01-15 10:30')).toBe(true);
      expect(isValidDatetime('2024-01-15 10:30:45')).toBe(true);
      expect(isValidDatetime('2024-01-15')).toBe(false);
    });
  });

  describe('isValidTime', () => {
    it('should validate times', () => {
      expect(isValidTime('10:30')).toBe(true);
      expect(isValidTime('10:30:45')).toBe(true);
      expect(isValidTime('invalid')).toBe(false);
    });
  });

  describe('isValidInteger', () => {
    it('should validate integers', () => {
      expect(isValidInteger('123')).toBe(true);
      expect(isValidInteger('-456')).toBe(true);
      expect(isValidInteger('12.34')).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    it('should validate numbers', () => {
      expect(isValidNumber('123')).toBe(true);
      expect(isValidNumber('12.34')).toBe(true);
      expect(isValidNumber('abc')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('invalid')).toBe(false);
    });
  });
});

describe('isInRange', () => {
  it('should return true when value is within range', () => {
    expect(isInRange(5, 1, 10)).toBe(true);
    expect(isInRange(1, 1, 10)).toBe(true);
    expect(isInRange(10, 1, 10)).toBe(true);
  });

  it('should return false when value is below min', () => {
    expect(isInRange(0, 1, 10)).toBe(false);
  });

  it('should return false when value is above max', () => {
    expect(isInRange(11, 1, 10)).toBe(false);
  });

  it('should work with only min', () => {
    expect(isInRange(5, 1)).toBe(true);
    expect(isInRange(0, 1)).toBe(false);
  });

  it('should work with only max', () => {
    expect(isInRange(5, undefined, 10)).toBe(true);
    expect(isInRange(11, undefined, 10)).toBe(false);
  });

  it('should work with no bounds', () => {
    expect(isInRange(Number.MAX_VALUE)).toBe(true);
    expect(isInRange(Number.MIN_VALUE)).toBe(true);
  });
});

describe('isValidLength', () => {
  it('should return true when length is within range', () => {
    expect(isValidLength('hello', 1, 10)).toBe(true);
    expect(isValidLength('a', 1, 10)).toBe(true);
    expect(isValidLength('1234567890', 1, 10)).toBe(true);
  });

  it('should return false when length is below min', () => {
    expect(isValidLength('', 1, 10)).toBe(false);
  });

  it('should return false when length is above max', () => {
    expect(isValidLength('12345678901', 1, 10)).toBe(false);
  });

  it('should work with only min', () => {
    expect(isValidLength('hello', 1)).toBe(true);
    expect(isValidLength('', 1)).toBe(false);
  });

  it('should work with only max', () => {
    expect(isValidLength('hello', undefined, 10)).toBe(true);
    expect(isValidLength('12345678901', undefined, 10)).toBe(false);
  });

  it('should work with no bounds', () => {
    expect(isValidLength('')).toBe(true);
    expect(isValidLength('any string')).toBe(true);
  });
});
