import { describe, it, expect } from 'vitest';
import { isEmail } from './index';

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
      // This pattern could cause catastrophic backtracking in vulnerable regexes
      const maliciousInput = 'a'.repeat(50) + '@' + 'a'.repeat(50);
      isEmail(maliciousInput);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
