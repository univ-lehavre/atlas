/**
 * @module brands/token.test
 * @description Tests for REDCap token branded type
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import {
  RedcapToken,
  REDCAP_TOKEN_PATTERN,
  isValidToken,
  parseToken,
  generateToken,
} from './token.js';

describe('RedcapToken', () => {
  describe('REDCAP_TOKEN_PATTERN', () => {
    it('should match 32 uppercase hex characters', () => {
      expect(REDCAP_TOKEN_PATTERN.test('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
      expect(REDCAP_TOKEN_PATTERN.test('0123456789ABCDEF0123456789ABCDEF')).toBe(true);
      expect(REDCAP_TOKEN_PATTERN.test('DEADBEEF12345678DEADBEEF12345678')).toBe(true);
    });

    it('should not match lowercase hex characters', () => {
      expect(REDCAP_TOKEN_PATTERN.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
      expect(REDCAP_TOKEN_PATTERN.test('0123456789abcdef0123456789abcdef')).toBe(false);
    });

    it('should not match mixed case', () => {
      expect(REDCAP_TOKEN_PATTERN.test('AAAAAAAAAAAAAAAAaaaaaaaaaaaaaaaa')).toBe(false);
    });

    it('should not match wrong length', () => {
      expect(REDCAP_TOKEN_PATTERN.test('AABBCCDD')).toBe(false);
      expect(REDCAP_TOKEN_PATTERN.test('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABB')).toBe(false);
      expect(REDCAP_TOKEN_PATTERN.test('')).toBe(false);
    });

    it('should not match non-hex characters', () => {
      expect(REDCAP_TOKEN_PATTERN.test('GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG1')).toBe(false);
      expect(REDCAP_TOKEN_PATTERN.test('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(false);
    });
  });

  describe('RedcapToken validator', () => {
    it('should accept valid tokens', () => {
      expect(() => RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).not.toThrow();
      expect(() => RedcapToken('0123456789ABCDEF0123456789ABCDEF')).not.toThrow();
    });

    it('should return the branded value', () => {
      const token = RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
      expect(token).toBe('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    });

    it('should throw for invalid tokens', () => {
      expect(() => RedcapToken('invalid')).toThrow();
      expect(() => RedcapToken('')).toThrow();
      expect(() => RedcapToken('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toThrow();
    });

    it('should throw BrandErrors for invalid token', () => {
      // Brand.refined throws BrandErrors which is an array-like structure
      expect(() => RedcapToken('ABCD1234EFGH5678IJKL9012MNOP3456')).toThrow();
    });
  });

  describe('isValidToken', () => {
    it('should return true for valid tokens', () => {
      expect(isValidToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
      expect(isValidToken('0123456789ABCDEF0123456789ABCDEF')).toBe(true);
    });

    it('should return false for invalid tokens', () => {
      expect(isValidToken('')).toBe(false);
      expect(isValidToken('invalid')).toBe(false);
      expect(isValidToken('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
      expect(isValidToken('AABBCCDD')).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      if (isValidToken(value)) {
        // TypeScript should narrow to RedcapToken
        const _token: RedcapToken = value;
        expect(_token).toBe(value);
      }
    });
  });

  describe('parseToken', () => {
    it('should return Right for valid tokens', () => {
      const result = parseToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
      }
    });

    it('should return Left for invalid tokens', () => {
      const result = parseToken('invalid');
      expect(Either.isLeft(result)).toBe(true);
    });

    it('should return Left for empty string', () => {
      const result = parseToken('');
      expect(Either.isLeft(result)).toBe(true);
    });

    it('should return Left for lowercase tokens', () => {
      const result = parseToken('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      expect(Either.isLeft(result)).toBe(true);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const token = generateToken();
      expect(isValidToken(token)).toBe(true);
    });

    it('should generate 32-character token', () => {
      const token = generateToken();
      expect(token.length).toBe(32);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should only use uppercase hex characters', () => {
      const token = generateToken();
      expect(/^[0-9A-F]+$/.test(token)).toBe(true);
    });
  });
});
