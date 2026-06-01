/**
 * @module brands/record.property.test
 * @description Property-based tests for RecordId using fast-check.
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import * as fc from 'fast-check';
import { RecordId, RECORD_ID_PATTERN, isValidRecordId, parseRecordId } from './record.js';

describe('RecordId — properties', () => {
  it('accepts any non-empty string of word characters and hyphens', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[\w-]+$/, { minLength: 1, maxLength: 50 }), (value) => {
        expect(isValidRecordId(value)).toBe(true);
        expect(() => RecordId(value)).not.toThrow();
        expect(Either.isRight(parseRecordId(value))).toBe(true);
      })
    );
  });

  it('rejects the empty string', () => {
    expect(isValidRecordId('')).toBe(false);
    expect(() => RecordId('')).toThrow();
    expect(Either.isLeft(parseRecordId(''))).toBe(true);
  });

  it('rejects any string containing whitespace or special characters', () => {
    fc.assert(
      fc.property(
        // characters guaranteed to be outside [\w-]
        fc.stringMatching(/^[ @!#$%^&*()+={}[\]|\\:;"'<>,.?/]+$/, {
          minLength: 1,
          maxLength: 20,
        }),
        (value) => {
          expect(isValidRecordId(value)).toBe(false);
          expect(Either.isLeft(parseRecordId(value))).toBe(true);
        }
      )
    );
  });

  it('Brand round-trip: RecordId(x) preserves the underlying string', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[\w-]+$/, { minLength: 1, maxLength: 50 }), (value) => {
        const branded = RecordId(value);
        expect(branded).toBe(value);
      })
    );
  });

  it('isValidRecordId is consistent with RECORD_ID_PATTERN for non-empty input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (value) => {
        expect(isValidRecordId(value)).toBe(RECORD_ID_PATTERN.test(value));
      })
    );
  });
});
