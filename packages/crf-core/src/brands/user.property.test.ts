/**
 * @module brands/user.property.test
 * @description Property-based tests for UserId / Email using fast-check.
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import * as fc from 'fast-check';
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

describe('UserId — properties', () => {
  it('accepts any non-empty string of word characters', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\w+$/, { minLength: 1, maxLength: 30 }), (value) => {
        expect(isValidUserId(value)).toBe(true);
        expect(() => UserId(value)).not.toThrow();
        expect(Either.isRight(parseUserId(value))).toBe(true);
      })
    );
  });

  it('rejects the empty string', () => {
    expect(isValidUserId('')).toBe(false);
    expect(Either.isLeft(parseUserId(''))).toBe(true);
  });

  it('rejects strings containing hyphens, dots, spaces, or @', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[\w]*[-. @][\w]*$/, { minLength: 1, maxLength: 20 }),
        (value) => {
          expect(isValidUserId(value)).toBe(false);
          expect(Either.isLeft(parseUserId(value))).toBe(true);
        }
      )
    );
  });

  it('Brand round-trip: UserId(x) preserves the underlying string', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\w+$/, { minLength: 1, maxLength: 30 }), (value) => {
        expect(UserId(value)).toBe(value);
      })
    );
  });

  it('isValidUserId is consistent with USER_ID_PATTERN for non-empty input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 30 }), (value) => {
        expect(isValidUserId(value)).toBe(USER_ID_PATTERN.test(value));
      })
    );
  });
});

describe('Email — properties', () => {
  it('accepts any address produced by fc.emailAddress()', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (value) => {
        expect(isValidEmail(value)).toBe(true);
        expect(() => Email(value)).not.toThrow();
        expect(Either.isRight(parseEmail(value))).toBe(true);
      })
    );
  });

  it('rejects any string without an @', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes('@')),
        (value) => {
          expect(isValidEmail(value)).toBe(false);
          expect(Either.isLeft(parseEmail(value))).toBe(true);
        }
      )
    );
  });

  it('rejects strings with whitespace anywhere', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(fc.emailAddress(), fc.constantFrom(' ', '\t', '\n'))
          .map(([email, ws]) => `${email}${ws}suffix`),
        (value) => {
          expect(isValidEmail(value)).toBe(false);
          expect(Either.isLeft(parseEmail(value))).toBe(true);
        }
      )
    );
  });

  it('Brand round-trip: Email(x) preserves the underlying string', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (value) => {
        expect(Email(value)).toBe(value);
      })
    );
  });

  it('isValidEmail is consistent with EMAIL_PATTERN', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 100 }), (value) => {
        expect(isValidEmail(value)).toBe(EMAIL_PATTERN.test(value));
      })
    );
  });
});
