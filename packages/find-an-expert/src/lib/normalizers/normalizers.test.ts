import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './index';

describe('normalizeEmail', () => {
  describe('subaddressing removal', () => {
    it('should remove everything after + in local part', () => {
      expect(normalizeEmail('user+tag@example.com')).toBe('user@example.com');
    });

    it('should handle multiple + signs', () => {
      expect(normalizeEmail('user+tag+extra@example.com')).toBe('user@example.com');
    });

    it('should preserve email without +', () => {
      expect(normalizeEmail('user@example.com')).toBe('user@example.com');
    });
  });

  describe('case normalization', () => {
    it('should convert to lowercase', () => {
      expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should handle mixed case with subaddressing', () => {
      expect(normalizeEmail('User+Tag@Example.COM')).toBe('user@example.com');
    });
  });

  describe('edge cases', () => {
    it('should handle email without @', () => {
      expect(normalizeEmail('notanemail')).toBe('notanemail');
    });

    it('should handle empty string', () => {
      expect(normalizeEmail('')).toBe('');
    });

    it('should handle + at start of local part', () => {
      expect(normalizeEmail('+tag@example.com')).toBe('@example.com');
    });

    it('should preserve dots in local part', () => {
      expect(normalizeEmail('first.last+tag@example.com')).toBe('first.last@example.com');
    });

    it('should handle subdomain', () => {
      expect(normalizeEmail('user+tag@mail.example.com')).toBe('user@mail.example.com');
    });
  });
});
