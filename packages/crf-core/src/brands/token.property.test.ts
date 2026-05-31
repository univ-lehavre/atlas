/**
 * @module brands/token.property.test
 * @description Property-based tests for CrfToken using fast-check.
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import * as fc from 'fast-check';
import { CrfToken, CRF_TOKEN_PATTERN, isValidToken, parseToken, generateToken } from './token.js';

describe('CrfToken — properties', () => {
  it('accepts any string of 32 uppercase hex characters', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-F0-9]{32}$/), (value) => {
        expect(isValidToken(value)).toBe(true);
        expect(() => CrfToken(value)).not.toThrow();
        expect(Either.isRight(parseToken(value))).toBe(true);
      })
    );
  });

  it('rejects any string whose length is not exactly 32', () => {
    fc.assert(
      fc.property(
        fc
          .stringMatching(/^[A-F0-9]+$/, { minLength: 1, maxLength: 64 })
          .filter((s) => s.length !== 32),
        (value) => {
          expect(isValidToken(value)).toBe(false);
          expect(() => CrfToken(value)).toThrow();
          expect(Either.isLeft(parseToken(value))).toBe(true);
        }
      )
    );
  });

  it('rejects 32-char strings containing any non-uppercase-hex character', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z]{32}$/), (value) => {
        expect(isValidToken(value)).toBe(false);
        expect(Either.isLeft(parseToken(value))).toBe(true);
      })
    );
  });

  it('Brand round-trip: CrfToken(x) preserves the underlying string', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-F0-9]{32}$/), (value) => {
        const branded = CrfToken(value);
        expect(branded).toBe(value);
      })
    );
  });

  it('generateToken always returns a valid token matching the pattern', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), () => {
        const token = generateToken();
        expect(CRF_TOKEN_PATTERN.test(token)).toBe(true);
        expect(isValidToken(token)).toBe(true);
      })
    );
  });
});
