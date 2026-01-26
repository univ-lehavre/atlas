/**
 * @module brands/user.test
 * @description Tests for REDCap user-related branded types
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import {
  UserId,
  USER_ID_PATTERN,
  isValidUserId,
  parseUserId,
  Email,
  EMAIL_PATTERN,
  isValidEmail,
  parseEmail,
} from './user.js';

describe('UserId', () => {
  describe('USER_ID_PATTERN', () => {
    it('should match alphanumeric strings', () => {
      expect(USER_ID_PATTERN.test('user123')).toBe(true);
      expect(USER_ID_PATTERN.test('johndoe')).toBe(true);
      expect(USER_ID_PATTERN.test('JohnDoe')).toBe(true);
      expect(USER_ID_PATTERN.test('123')).toBe(true);
    });

    it('should match strings with underscores', () => {
      expect(USER_ID_PATTERN.test('john_doe')).toBe(true);
      expect(USER_ID_PATTERN.test('user_123')).toBe(true);
      expect(USER_ID_PATTERN.test('_user')).toBe(true);
    });

    it('should not match strings with hyphens', () => {
      expect(USER_ID_PATTERN.test('john-doe')).toBe(false);
      expect(USER_ID_PATTERN.test('user-123')).toBe(false);
    });

    it('should not match strings with special characters', () => {
      expect(USER_ID_PATTERN.test('user@domain')).toBe(false);
      expect(USER_ID_PATTERN.test('user.name')).toBe(false);
      expect(USER_ID_PATTERN.test('user name')).toBe(false);
    });

    it('should not match empty string', () => {
      expect(USER_ID_PATTERN.test('')).toBe(false);
    });
  });

  describe('UserId validator', () => {
    it('should accept valid user IDs', () => {
      expect(() => UserId('user123')).not.toThrow();
      expect(() => UserId('john_doe')).not.toThrow();
      expect(() => UserId('a')).not.toThrow();
    });

    it('should return the branded value', () => {
      const id = UserId('admin');
      expect(id).toBe('admin');
    });

    it('should throw for invalid user IDs', () => {
      expect(() => UserId('')).toThrow();
      expect(() => UserId('user-123')).toThrow();
      expect(() => UserId('user@domain')).toThrow();
    });
  });

  describe('isValidUserId', () => {
    it('should return true for valid user IDs', () => {
      expect(isValidUserId('user123')).toBe(true);
      expect(isValidUserId('john_doe')).toBe(true);
    });

    it('should return false for invalid user IDs', () => {
      expect(isValidUserId('')).toBe(false);
      expect(isValidUserId('user-123')).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = 'user123';
      if (isValidUserId(value)) {
        const _id: UserId = value;
        expect(_id).toBe(value);
      }
    });
  });

  describe('parseUserId', () => {
    it('should return Right for valid user IDs', () => {
      const result = parseUserId('admin');
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe('admin');
      }
    });

    it('should return Left for invalid user IDs', () => {
      expect(Either.isLeft(parseUserId(''))).toBe(true);
      expect(Either.isLeft(parseUserId('user@domain'))).toBe(true);
    });
  });
});

describe('Email', () => {
  describe('EMAIL_PATTERN', () => {
    it('should match valid email addresses', () => {
      expect(EMAIL_PATTERN.test('user@example.com')).toBe(true);
      expect(EMAIL_PATTERN.test('test.user@domain.org')).toBe(true);
      expect(EMAIL_PATTERN.test('a@b.co')).toBe(true);
      expect(EMAIL_PATTERN.test('user+tag@example.com')).toBe(true);
    });

    it('should match emails with subdomains', () => {
      expect(EMAIL_PATTERN.test('user@mail.example.com')).toBe(true);
      expect(EMAIL_PATTERN.test('user@sub.domain.org')).toBe(true);
    });

    it('should match emails with numbers', () => {
      expect(EMAIL_PATTERN.test('user123@example.com')).toBe(true);
      expect(EMAIL_PATTERN.test('user@example123.com')).toBe(true);
    });

    it('should not match without @', () => {
      expect(EMAIL_PATTERN.test('userexample.com')).toBe(false);
      expect(EMAIL_PATTERN.test('user')).toBe(false);
    });

    it('should not match without domain', () => {
      expect(EMAIL_PATTERN.test('user@')).toBe(false);
    });

    it('should not match without TLD', () => {
      expect(EMAIL_PATTERN.test('user@domain')).toBe(false);
    });

    it('should not match with spaces', () => {
      expect(EMAIL_PATTERN.test('user @example.com')).toBe(false);
      expect(EMAIL_PATTERN.test('user@ example.com')).toBe(false);
      expect(EMAIL_PATTERN.test(' user@example.com')).toBe(false);
      expect(EMAIL_PATTERN.test('user@example.com ')).toBe(false);
    });

    it('should not match empty string', () => {
      expect(EMAIL_PATTERN.test('')).toBe(false);
    });
  });

  describe('Email validator', () => {
    it('should accept valid emails', () => {
      expect(() => Email('user@example.com')).not.toThrow();
      expect(() => Email('test.user@domain.org')).not.toThrow();
    });

    it('should return the branded value', () => {
      const email = Email('admin@example.com');
      expect(email).toBe('admin@example.com');
    });

    it('should throw for invalid emails', () => {
      expect(() => Email('')).toThrow();
      expect(() => Email('invalid')).toThrow();
      expect(() => Email('user@')).toThrow();
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('a@b.co')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = 'user@example.com';
      if (isValidEmail(value)) {
        const _email: Email = value;
        expect(_email).toBe(value);
      }
    });
  });

  describe('parseEmail', () => {
    it('should return Right for valid emails', () => {
      const result = parseEmail('user@example.com');
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe('user@example.com');
      }
    });

    it('should return Left for invalid emails', () => {
      expect(Either.isLeft(parseEmail(''))).toBe(true);
      expect(Either.isLeft(parseEmail('invalid'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle international domains', () => {
      // Basic TLDs should work
      expect(isValidEmail('user@example.co.uk')).toBe(true);
      expect(isValidEmail('user@example.com.br')).toBe(true);
    });

    it('should handle common email providers', () => {
      expect(isValidEmail('user@gmail.com')).toBe(true);
      expect(isValidEmail('user@outlook.com')).toBe(true);
      expect(isValidEmail('user@yahoo.fr')).toBe(true);
    });

    it('should handle institutional emails', () => {
      expect(isValidEmail('researcher@university.edu')).toBe(true);
      expect(isValidEmail('admin@hospital.org')).toBe(true);
    });
  });
});
