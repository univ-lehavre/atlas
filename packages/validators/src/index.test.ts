import { describe, it, expect } from 'vitest';
import {
  isEmail,
  isHexadecimal,
  ensureJsonContentType,
  parseJsonBody,
  validateAndParseJsonBody,
  normalizeEmail,
} from './index.js';
import { InvalidContentTypeError, InvalidJsonBodyError } from '@univ-lehavre/atlas-errors';

describe('isEmail', () => {
  describe('valid emails', () => {
    it('should return true for a simple valid email', () => {
      expect(isEmail('test@example.com')).toBe(true);
    });

    it('should return true for email with subdomain', () => {
      expect(isEmail('user@mail.example.com')).toBe(true);
    });

    it('should return true for email with dots in local part', () => {
      expect(isEmail('first.last@example.com')).toBe(true);
    });

    it('should return true for email with underscores', () => {
      expect(isEmail('user_name@example.com')).toBe(true);
    });

    it('should return true for email with hyphens', () => {
      expect(isEmail('user-name@example.com')).toBe(true);
    });

    it('should return true for email with numbers', () => {
      expect(isEmail('user123@example123.com')).toBe(true);
    });

    it('should return true for email with mixed characters', () => {
      expect(isEmail('user.name-123_test@sub.example.org')).toBe(true);
    });

    it('should return true for email with long TLD', () => {
      expect(isEmail('test@example.museum')).toBe(true);
    });

    it('should return true for email with plus sign', () => {
      expect(isEmail('user+tag@example.com')).toBe(true);
    });

    it('should return true for email with special RFC 5322 characters', () => {
      expect(isEmail("user!#$%&'*+/=?^`{|}~@example.com")).toBe(true);
    });

    it('should return true for IP address domain', () => {
      expect(isEmail('user@[192.168.1.1]')).toBe(true);
    });
  });

  describe('invalid emails', () => {
    it('should return false for empty string', () => {
      expect(isEmail('')).toBe(false);
    });

    it('should return false for email without @', () => {
      expect(isEmail('testexample.com')).toBe(false);
    });

    it('should return false for email without domain', () => {
      expect(isEmail('test@')).toBe(false);
    });

    it('should return false for email without local part', () => {
      expect(isEmail('@example.com')).toBe(false);
    });

    it('should return false for email without TLD', () => {
      expect(isEmail('test@example')).toBe(false);
    });

    it('should return false for email with single char TLD', () => {
      expect(isEmail('test@example.c')).toBe(false);
    });

    it('should return false for email with spaces', () => {
      expect(isEmail('test @example.com')).toBe(false);
    });

    it('should return false for email with consecutive dots in local part', () => {
      expect(isEmail('test..user@example.com')).toBe(false);
    });

    it('should return false for email starting with dot', () => {
      expect(isEmail('.test@example.com')).toBe(false);
    });

    it('should return false for email ending with dot before @', () => {
      expect(isEmail('test.@example.com')).toBe(false);
    });

    it('should return false for email exceeding 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isEmail(longEmail)).toBe(false);
    });

    it('should return false for just text', () => {
      expect(isEmail('not an email')).toBe(false);
    });

    it('should return false for domain starting with hyphen', () => {
      expect(isEmail('test@-example.com')).toBe(false);
    });

    it('should return false for domain ending with hyphen', () => {
      expect(isEmail('test@example-.com')).toBe(false);
    });
  });

  describe('ReDoS protection', () => {
    it('should handle malicious input quickly', () => {
      const start = performance.now();
      const maliciousInput = 'a'.repeat(50) + '@' + 'a'.repeat(50);
      isEmail(maliciousInput);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });
});

describe('isHexadecimal', () => {
  it('should return true for lowercase hex', () => {
    expect(isHexadecimal('abc123')).toBe(true);
  });

  it('should return true for uppercase hex', () => {
    expect(isHexadecimal('ABC123')).toBe(true);
  });

  it('should return true for mixed case hex', () => {
    expect(isHexadecimal('AbC123dEf')).toBe(true);
  });

  it('should return true for numbers only', () => {
    expect(isHexadecimal('0123456789')).toBe(true);
  });

  it('should return false for non-hex characters', () => {
    expect(isHexadecimal('xyz')).toBe(false);
  });

  it('should return false for special characters', () => {
    expect(isHexadecimal('abc-123')).toBe(false);
  });

  it('should return false for spaces', () => {
    expect(isHexadecimal('abc 123')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isHexadecimal('')).toBe(false);
  });
});

describe('ensureJsonContentType', () => {
  it('should not throw for application/json', () => {
    const request = new Request('http://test', {
      headers: { 'content-type': 'application/json' },
    });
    expect(() => ensureJsonContentType(request)).not.toThrow();
  });

  it('should not throw for application/json with charset', () => {
    const request = new Request('http://test', {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
    expect(() => ensureJsonContentType(request)).not.toThrow();
  });

  it('should throw InvalidContentTypeError for text/plain', () => {
    const request = new Request('http://test', {
      headers: { 'content-type': 'text/plain' },
    });
    expect(() => ensureJsonContentType(request)).toThrow(InvalidContentTypeError);
  });

  it('should throw InvalidContentTypeError for missing content-type', () => {
    const request = new Request('http://test');
    expect(() => ensureJsonContentType(request)).toThrow(InvalidContentTypeError);
  });
});

describe('parseJsonBody', () => {
  it('should parse valid JSON object', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
    });
    const body = await parseJsonBody(request);
    expect(body).toEqual({ foo: 'bar' });
  });

  it('should throw for array body', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      body: JSON.stringify([1, 2, 3]),
    });
    await expect(parseJsonBody(request)).rejects.toThrow(InvalidJsonBodyError);
  });

  it('should throw for invalid JSON', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      body: 'not json',
    });
    await expect(parseJsonBody(request)).rejects.toThrow(InvalidJsonBodyError);
  });

  it('should throw for null body', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      body: 'null',
    });
    await expect(parseJsonBody(request)).rejects.toThrow(InvalidJsonBodyError);
  });
});

describe('validateAndParseJsonBody', () => {
  it('should parse valid JSON with correct content-type', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    const body = await validateAndParseJsonBody(request);
    expect(body).toEqual({ email: 'test@example.com' });
  });

  it('should throw InvalidContentTypeError for wrong content-type', async () => {
    const request = new Request('http://test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ foo: 'bar' }),
    });
    await expect(validateAndParseJsonBody(request)).rejects.toThrow(InvalidContentTypeError);
  });
});

describe('normalizeEmail', () => {
  it('should lowercase the email', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('should remove subaddressing', () => {
    expect(normalizeEmail('user+tag@example.com')).toBe('user@example.com');
  });

  it('should handle multiple + signs', () => {
    expect(normalizeEmail('user+tag+extra@example.com')).toBe('user@example.com');
  });

  it('should handle email without +', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });

  it('should handle invalid email gracefully', () => {
    expect(normalizeEmail('notanemail')).toBe('notanemail');
  });
});
