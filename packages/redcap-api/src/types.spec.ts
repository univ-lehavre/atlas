import { describe, it, expect } from 'vitest';
import {
  RedcapUrl,
  RedcapToken,
  RecordId,
  InstrumentName,
  UserId,
  Email,
  PositiveInt,
  NonEmptyString,
  IsoTimestamp,
  BooleanFlag,
} from './types.js';

describe('RedcapUrl', () => {
  describe('valid URLs', () => {
    it('should accept valid HTTPS URL', () => {
      const url = 'https://redcap.example.com/api/';
      expect(() => RedcapUrl(url)).not.toThrow();
      expect(RedcapUrl(url)).toBe(url);
    });

    it('should accept valid HTTP URL', () => {
      const url = 'http://localhost:8080/redcap/api/';
      expect(() => RedcapUrl(url)).not.toThrow();
      expect(RedcapUrl(url)).toBe(url);
    });

    it('should accept URL without trailing slash', () => {
      const url = 'https://redcap.example.com/api';
      expect(() => RedcapUrl(url)).not.toThrow();
    });

    it('should accept URL with port number', () => {
      const url = 'https://redcap.example.com:443/api/';
      expect(() => RedcapUrl(url)).not.toThrow();
    });

    it('should accept URL with subdomain', () => {
      const url = 'https://research.redcap.example.com/api/';
      expect(() => RedcapUrl(url)).not.toThrow();
    });
  });

  describe('invalid URLs', () => {
    it('should reject non-URL string', () => {
      expect(() => RedcapUrl('not-a-url')).toThrow();
    });

    it('should reject URL with query string', () => {
      expect(() => RedcapUrl('https://redcap.example.com/api/?token=abc')).toThrow();
    });

    it('should reject URL with hash fragment', () => {
      expect(() => RedcapUrl('https://redcap.example.com/api/#section')).toThrow();
    });

    it('should reject URL with embedded credentials', () => {
      expect(() => RedcapUrl('https://user:pass@redcap.example.com/api/')).toThrow();
    });

    it('should reject URL with username only', () => {
      expect(() => RedcapUrl('https://user@redcap.example.com/api/')).toThrow();
    });

    it('should reject FTP protocol', () => {
      expect(() => RedcapUrl('ftp://redcap.example.com/api/')).toThrow();
    });

    it('should reject file protocol', () => {
      expect(() => RedcapUrl('file:///path/to/file')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => RedcapUrl('')).toThrow();
    });

    it('should reject javascript protocol', () => {
      expect(() => RedcapUrl('javascript:alert(1)')).toThrow();
    });
  });
});

describe('RedcapToken', () => {
  describe('valid tokens', () => {
    it('should accept valid 32-character uppercase hex token', () => {
      const token = 'AABBCCDD11223344AABBCCDD11223344';
      expect(() => RedcapToken(token)).not.toThrow();
      expect(RedcapToken(token)).toBe(token);
    });

    it('should accept token with all digits', () => {
      const token = '12345678901234567890123456789012';
      expect(() => RedcapToken(token)).not.toThrow();
    });

    it('should accept token with all uppercase letters A-F', () => {
      const token = 'ABCDEFABCDEFABCDEFABCDEFABCDEFAB';
      expect(() => RedcapToken(token)).not.toThrow();
    });

    it('should accept mixed valid characters', () => {
      const token = '0123456789ABCDEF0123456789ABCDEF';
      expect(() => RedcapToken(token)).not.toThrow();
    });
  });

  describe('invalid tokens', () => {
    it('should reject lowercase hex characters', () => {
      const token = 'e1b217963ccee21ef78322345b3b8782';
      expect(() => RedcapToken(token)).toThrow();
    });

    it('should reject mixed case token', () => {
      const token = 'E1B217963CCee21EF78322345B3B8782';
      expect(() => RedcapToken(token)).toThrow();
    });

    it('should reject token shorter than 32 characters', () => {
      const token = 'E1B217963CCEE21EF78322345B3B878';
      expect(() => RedcapToken(token)).toThrow();
    });

    it('should reject token longer than 32 characters', () => {
      const token = 'AABBCCDD11223344AABBCCDD112233445';
      expect(() => RedcapToken(token)).toThrow();
    });

    it('should reject token with invalid hex character G', () => {
      const token = 'G1B217963CCEE21EF78322345B3B8782';
      expect(() => RedcapToken(token)).toThrow();
    });

    it('should reject token with special characters', () => {
      const token = 'E1B217963CCEE21EF78322345B3B878-';
      expect(() => RedcapToken(token)).toThrow();
    });

    it('should reject token with spaces', () => {
      const token = 'E1B217963CCEE21EF78322345B3B878 ';
      expect(() => RedcapToken(token)).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => RedcapToken('')).toThrow();
    });
  });
});

describe('RecordId', () => {
  describe('valid record IDs', () => {
    it('should accept 20-character alphanumeric ID', () => {
      const id = 'abc12345678901234567';
      expect(() => RecordId(id)).not.toThrow();
      expect(RecordId(id)).toBe(id);
    });

    it('should accept ID longer than 20 characters', () => {
      const id = 'abc123456789012345678901234567890';
      expect(() => RecordId(id)).not.toThrow();
    });

    it('should accept all-digit ID', () => {
      const id = '12345678901234567890';
      expect(() => RecordId(id)).not.toThrow();
    });

    it('should accept all-uppercase ID', () => {
      const id = 'ABCDEFGHIJKLMNOPQRST';
      expect(() => RecordId(id)).not.toThrow();
    });

    it('should accept all-lowercase ID', () => {
      const id = 'abcdefghijklmnopqrst';
      expect(() => RecordId(id)).not.toThrow();
    });

    it('should accept mixed case alphanumeric ID', () => {
      const id = 'AbCdEf123456789012gh';
      expect(() => RecordId(id)).not.toThrow();
    });
  });

  describe('invalid record IDs', () => {
    it('should reject ID shorter than 20 characters', () => {
      const id = 'abc1234567890123456';
      expect(() => RecordId(id)).toThrow();
    });

    it('should reject ID with hyphens', () => {
      const id = 'abc-1234-5678-9012-3456';
      expect(() => RecordId(id)).toThrow();
    });

    it('should reject ID with underscores', () => {
      const id = 'abc_1234_5678_9012_34';
      expect(() => RecordId(id)).toThrow();
    });

    it('should reject ID with special characters', () => {
      const id = 'abc12345678901234567!';
      expect(() => RecordId(id)).toThrow();
    });

    it('should reject ID with spaces', () => {
      const id = 'abc 12345678901234567';
      expect(() => RecordId(id)).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => RecordId('')).toThrow();
    });
  });
});

describe('InstrumentName', () => {
  describe('valid instrument names', () => {
    it('should accept simple lowercase name', () => {
      const name = 'demographics';
      expect(() => InstrumentName(name)).not.toThrow();
      expect(InstrumentName(name)).toBe(name);
    });

    it('should accept name with underscores', () => {
      const name = 'my_survey';
      expect(() => InstrumentName(name)).not.toThrow();
    });

    it('should accept name with numbers', () => {
      const name = 'visit_1_form';
      expect(() => InstrumentName(name)).not.toThrow();
    });

    it('should accept single letter name', () => {
      const name = 'a';
      expect(() => InstrumentName(name)).not.toThrow();
    });

    it('should accept name ending with number', () => {
      const name = 'form1';
      expect(() => InstrumentName(name)).not.toThrow();
    });

    it('should accept name with multiple underscores', () => {
      const name = 'a_b_c_d_e_f';
      expect(() => InstrumentName(name)).not.toThrow();
    });
  });

  describe('invalid instrument names', () => {
    it('should reject uppercase letters', () => {
      const name = 'My_Survey';
      expect(() => InstrumentName(name)).toThrow();
    });

    it('should reject name starting with number', () => {
      const name = '1_survey';
      expect(() => InstrumentName(name)).toThrow();
    });

    it('should reject name starting with underscore', () => {
      const name = '_survey';
      expect(() => InstrumentName(name)).toThrow();
    });

    it('should reject name with hyphens', () => {
      const name = 'my-survey';
      expect(() => InstrumentName(name)).toThrow();
    });

    it('should reject name with spaces', () => {
      const name = 'my survey';
      expect(() => InstrumentName(name)).toThrow();
    });

    it('should reject name with special characters', () => {
      const name = 'my_survey!';
      expect(() => InstrumentName(name)).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => InstrumentName('')).toThrow();
    });

    it('should reject name with only numbers', () => {
      const name = '12345';
      expect(() => InstrumentName(name)).toThrow();
    });
  });
});

describe('UserId', () => {
  describe('valid user IDs', () => {
    it('should accept simple alphanumeric ID', () => {
      const id = 'user123';
      expect(() => UserId(id)).not.toThrow();
      expect(UserId(id)).toBe(id);
    });

    it('should accept ID with underscores', () => {
      const id = 'john_doe';
      expect(() => UserId(id)).not.toThrow();
    });

    it('should accept all-digit ID', () => {
      const id = '123456';
      expect(() => UserId(id)).not.toThrow();
    });

    it('should accept single character ID', () => {
      const id = 'a';
      expect(() => UserId(id)).not.toThrow();
    });

    it('should accept mixed case ID', () => {
      const id = 'JohnDoe123';
      expect(() => UserId(id)).not.toThrow();
    });
  });

  describe('invalid user IDs', () => {
    it('should reject empty string', () => {
      expect(() => UserId('')).toThrow();
    });

    it('should reject ID with @ symbol', () => {
      expect(() => UserId('user@123')).toThrow();
    });

    it('should reject ID with spaces', () => {
      expect(() => UserId('user 123')).toThrow();
    });

    it('should reject ID with hyphens', () => {
      expect(() => UserId('user-123')).toThrow();
    });

    it('should reject ID with special characters', () => {
      expect(() => UserId('user!123')).toThrow();
    });
  });
});

describe('Email', () => {
  describe('valid emails', () => {
    it('should accept standard email', () => {
      const email = 'user@example.com';
      expect(() => Email(email)).not.toThrow();
      expect(Email(email)).toBe(email);
    });

    it('should accept email with subdomain', () => {
      const email = 'user@mail.example.com';
      expect(() => Email(email)).not.toThrow();
    });

    it('should accept email with plus tag', () => {
      const email = 'user+tag@example.com';
      expect(() => Email(email)).not.toThrow();
    });

    it('should accept email with dots in local part', () => {
      const email = 'john.doe@example.com';
      expect(() => Email(email)).not.toThrow();
    });

    it('should accept email with edu domain', () => {
      const email = 'student@university.edu';
      expect(() => Email(email)).not.toThrow();
    });
  });

  describe('invalid emails', () => {
    it('should reject empty string', () => {
      expect(() => Email('')).toThrow();
    });

    it('should reject string without @', () => {
      expect(() => Email('userexample.com')).toThrow();
    });

    it('should reject string without domain', () => {
      expect(() => Email('user@')).toThrow();
    });

    it('should reject string without local part', () => {
      expect(() => Email('@example.com')).toThrow();
    });

    it('should reject string without TLD', () => {
      expect(() => Email('user@example')).toThrow();
    });

    it('should reject string with spaces', () => {
      expect(() => Email('user @example.com')).toThrow();
    });
  });
});

describe('PositiveInt', () => {
  describe('valid positive integers', () => {
    it('should accept 1', () => {
      expect(() => PositiveInt(1)).not.toThrow();
      expect(PositiveInt(1)).toBe(1);
    });

    it('should accept large positive integer', () => {
      expect(() => PositiveInt(12_345)).not.toThrow();
    });

    it('should accept Number.MAX_SAFE_INTEGER', () => {
      expect(() => PositiveInt(Number.MAX_SAFE_INTEGER)).not.toThrow();
    });
  });

  describe('invalid values', () => {
    it('should reject 0', () => {
      expect(() => PositiveInt(0)).toThrow();
    });

    it('should reject negative integers', () => {
      expect(() => PositiveInt(-1)).toThrow();
    });

    it('should reject floats', () => {
      expect(() => PositiveInt(1.5)).toThrow();
    });

    it('should reject negative floats', () => {
      expect(() => PositiveInt(-1.5)).toThrow();
    });

    it('should reject NaN', () => {
      expect(() => PositiveInt(Number.NaN)).toThrow();
    });

    it('should reject Infinity', () => {
      expect(() => PositiveInt(Number.POSITIVE_INFINITY)).toThrow();
    });
  });
});

describe('NonEmptyString', () => {
  describe('valid non-empty strings', () => {
    it('should accept single character', () => {
      expect(() => NonEmptyString('a')).not.toThrow();
      expect(NonEmptyString('a')).toBe('a');
    });

    it('should accept multi-character string', () => {
      expect(() => NonEmptyString('hello world')).not.toThrow();
    });

    it('should accept string with only spaces', () => {
      expect(() => NonEmptyString('   ')).not.toThrow();
    });
  });

  describe('invalid values', () => {
    it('should reject empty string', () => {
      expect(() => NonEmptyString('')).toThrow();
    });
  });
});

describe('IsoTimestamp', () => {
  describe('valid timestamps', () => {
    it('should accept REDCap format with space', () => {
      const ts = '2024-01-15 10:30:00';
      expect(() => IsoTimestamp(ts)).not.toThrow();
      expect(IsoTimestamp(ts)).toBe(ts);
    });

    it('should accept ISO format with T', () => {
      expect(() => IsoTimestamp('2024-01-15T10:30:00')).not.toThrow();
    });

    it('should accept ISO format with Z', () => {
      expect(() => IsoTimestamp('2024-01-15T10:30:00Z')).not.toThrow();
    });

    it('should accept ISO format with timezone offset', () => {
      expect(() => IsoTimestamp('2024-01-15T10:30:00+02:00')).not.toThrow();
    });

    it('should accept date only', () => {
      expect(() => IsoTimestamp('2024-01-15')).not.toThrow();
    });
  });

  describe('invalid timestamps', () => {
    it('should reject invalid string', () => {
      expect(() => IsoTimestamp('invalid')).toThrow();
    });

    it('should reject wrong date format', () => {
      expect(() => IsoTimestamp('15/01/2024')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => IsoTimestamp('')).toThrow();
    });

    it('should reject invalid date values', () => {
      expect(() => IsoTimestamp('2024-13-45')).toThrow();
    });
  });
});

describe('BooleanFlag', () => {
  describe('valid flags', () => {
    it('should accept 0', () => {
      expect(() => BooleanFlag(0)).not.toThrow();
      expect(BooleanFlag(0)).toBe(0);
    });

    it('should accept 1', () => {
      expect(() => BooleanFlag(1)).not.toThrow();
      expect(BooleanFlag(1)).toBe(1);
    });
  });

  describe('invalid flags', () => {
    it('should reject 2', () => {
      expect(() => BooleanFlag(2 as unknown as 0 | 1)).toThrow();
    });

    it('should reject -1', () => {
      expect(() => BooleanFlag(-1 as unknown as 0 | 1)).toThrow();
    });

    it('should reject 0.5', () => {
      expect(() => BooleanFlag(0.5 as unknown as 0 | 1)).toThrow();
    });
  });
});
