/**
 * @module brands/instrument.property.test
 * @description Property-based tests for InstrumentName / FieldName using fast-check.
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import * as fc from 'fast-check';
import {
  InstrumentName,
  INSTRUMENT_NAME_PATTERN,
  isValidInstrumentName,
  parseInstrumentName,
  FieldName,
  FIELD_NAME_PATTERN,
  isValidFieldName,
  parseFieldName,
} from './instrument.js';

const validNameArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]$/),
    fc.stringMatching(/^[a-z0-9_]*$/, { minLength: 0, maxLength: 30 })
  )
  .map(([first, rest]) => `${first}${rest}`);

describe('InstrumentName — properties', () => {
  it('accepts any name starting with a lowercase letter then [a-z0-9_]*', () => {
    fc.assert(
      fc.property(validNameArb, (value) => {
        expect(isValidInstrumentName(value)).toBe(true);
        expect(() => InstrumentName(value)).not.toThrow();
        expect(Either.isRight(parseInstrumentName(value))).toBe(true);
      })
    );
  });

  it('rejects names starting with a digit or underscore', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9_][a-z0-9_]*$/, { minLength: 1, maxLength: 20 }),
        (value) => {
          expect(isValidInstrumentName(value)).toBe(false);
          expect(Either.isLeft(parseInstrumentName(value))).toBe(true);
        }
      )
    );
  });

  it('rejects names containing uppercase letters', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z][A-Za-z0-9_]*$/, { minLength: 1, maxLength: 20 }),
        (value) => {
          expect(isValidInstrumentName(value)).toBe(false);
          expect(Either.isLeft(parseInstrumentName(value))).toBe(true);
        }
      )
    );
  });

  it('rejects the empty string', () => {
    expect(isValidInstrumentName('')).toBe(false);
    expect(Either.isLeft(parseInstrumentName(''))).toBe(true);
  });

  it('Brand round-trip: InstrumentName(x) preserves the underlying string', () => {
    fc.assert(
      fc.property(validNameArb, (value) => {
        expect(InstrumentName(value)).toBe(value);
      })
    );
  });

  it('isValidInstrumentName is consistent with INSTRUMENT_NAME_PATTERN', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (value) => {
        expect(isValidInstrumentName(value)).toBe(INSTRUMENT_NAME_PATTERN.test(value));
      })
    );
  });
});

describe('FieldName — properties', () => {
  it('accepts any name starting with a lowercase letter then [a-z0-9_]*', () => {
    fc.assert(
      fc.property(validNameArb, (value) => {
        expect(isValidFieldName(value)).toBe(true);
        expect(() => FieldName(value)).not.toThrow();
        expect(Either.isRight(parseFieldName(value))).toBe(true);
      })
    );
  });

  it('rejects names containing dots, hyphens or whitespace', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-z0-9_]*[.\- ][a-z0-9_]*$/, {
          minLength: 3,
          maxLength: 30,
        }),
        (value) => {
          expect(isValidFieldName(value)).toBe(false);
          expect(Either.isLeft(parseFieldName(value))).toBe(true);
        }
      )
    );
  });

  it('Brand round-trip: FieldName(x) preserves the underlying string', () => {
    fc.assert(
      fc.property(validNameArb, (value) => {
        expect(FieldName(value)).toBe(value);
      })
    );
  });

  it('isValidFieldName is consistent with FIELD_NAME_PATTERN', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (value) => {
        expect(isValidFieldName(value)).toBe(FIELD_NAME_PATTERN.test(value));
      })
    );
  });
});
