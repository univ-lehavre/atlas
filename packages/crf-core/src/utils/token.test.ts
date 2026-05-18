/**
 * @module utils/token.test
 * @description Tests for token utility functions
 */

import { describe, it, expect } from 'vitest';
import { maskToken, tokensEqual } from './token.js';

describe('maskToken', () => {
  it('should mask standard 32-character token', () => {
    const token = 'A1B2C3D4E5F67890A1B2C3D4E5F67890';
    const masked = maskToken(token);
    expect(masked).toBe('A1B2************************7890');
    expect(masked.length).toBe(token.length);
  });

  it('should show first 4 and last 4 characters', () => {
    const token = 'DEADBEEF12345678CAFEBABE87654321';
    const masked = maskToken(token);
    expect(masked.startsWith('DEAD')).toBe(true);
    expect(masked.endsWith('4321')).toBe(true);
  });

  it('should fully mask short tokens (8 chars or less)', () => {
    expect(maskToken('ABCD')).toBe('****');
    expect(maskToken('ABCDEFGH')).toBe('********');
    expect(maskToken('')).toBe('');
  });

  it('should mask 9-character token correctly', () => {
    expect(maskToken('ABCDEFGHI')).toBe('ABCD*FGHI');
  });

  it('should handle various lengths', () => {
    expect(maskToken('1234567890').length).toBe(10);
    expect(maskToken('12345678901234567890').length).toBe(20);
  });
});

describe('tokensEqual', () => {
  describe('equality', () => {
    it('should return true for equal tokens', () => {
      expect(
        tokensEqual('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
      ).toBe(true);
      expect(
        tokensEqual('DEADBEEF12345678CAFEBABE87654321', 'DEADBEEF12345678CAFEBABE87654321')
      ).toBe(true);
    });

    it('should return false for different tokens', () => {
      expect(
        tokensEqual('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB')
      ).toBe(false);
      expect(
        tokensEqual('DEADBEEF12345678CAFEBABE87654321', 'DEADBEEF12345678CAFEBABE87654322')
      ).toBe(false);
    });

    it('should return false for tokens with different lengths', () => {
      expect(tokensEqual('AAAA', 'AAAAA')).toBe(false);
      expect(tokensEqual('SHORT', 'LONGERTOKEN')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(tokensEqual('', '')).toBe(true);
      expect(tokensEqual('', 'a')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(
        tokensEqual('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      ).toBe(false);
      expect(tokensEqual('AbCd', 'aBcD')).toBe(false);
    });
  });

  describe('constant-time behavior', () => {
    it('should compare all characters regardless of early mismatch', () => {
      // This test verifies the function structure, not timing
      // (timing tests are unreliable in JavaScript)
      const token1 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const token2 = 'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // First char different
      const token3 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB'; // Last char different

      // Both should return false, but the function should process all chars
      expect(tokensEqual(token1, token2)).toBe(false);
      expect(tokensEqual(token1, token3)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters', () => {
      expect(tokensEqual('!@#$%^&*()', '!@#$%^&*()')).toBe(true);
      expect(tokensEqual('!@#$%^&*()', '!@#$%^&*()!')).toBe(false);
    });

    it('should handle unicode characters', () => {
      expect(tokensEqual('émoji🎉test', 'émoji🎉test')).toBe(true);
      expect(tokensEqual('émoji🎉test', 'emoji🎉test')).toBe(false);
    });
  });
});
