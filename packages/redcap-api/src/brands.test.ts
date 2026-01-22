import { describe, it, expect } from 'vitest';
import { RedcapUrl, RedcapToken, RecordId, InstrumentName } from './brands.js';

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
