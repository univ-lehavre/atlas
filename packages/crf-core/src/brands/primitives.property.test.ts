/**
 * @module brands/primitives.property.test
 * @description Property-based tests for primitive brands using fast-check.
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import * as fc from 'fast-check';
import {
  PositiveInt,
  isPositiveInt,
  parsePositiveInt,
  NonNegativeInt,
  NonEmptyString,
  isNonEmptyString,
  ISO_TIMESTAMP_PATTERN,
  IsoTimestamp,
  isValidIsoTimestamp,
  toBooleanFlag,
  fromBooleanFlag,
} from './primitives.js';

describe('PositiveInt — properties', () => {
  it('accepts any integer >= 1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (value) => {
        expect(isPositiveInt(value)).toBe(true);
        expect(() => PositiveInt(value)).not.toThrow();
        expect(Either.isRight(parsePositiveInt(value))).toBe(true);
        expect(PositiveInt(value)).toBe(value);
      })
    );
  });

  it('rejects any integer <= 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: 0 }), (value) => {
        expect(isPositiveInt(value)).toBe(false);
        expect(() => PositiveInt(value)).toThrow();
        expect(Either.isLeft(parsePositiveInt(value))).toBe(true);
      })
    );
  });

  it('rejects any non-integer (float / NaN / Infinity)', () => {
    fc.assert(
      fc.property(
        fc.double({ noDefaultInfinity: false, noNaN: false }).filter((n) => !Number.isInteger(n)),
        (value) => {
          expect(isPositiveInt(value)).toBe(false);
          expect(() => PositiveInt(value)).toThrow();
        }
      )
    );
  });
});

describe('NonNegativeInt — properties', () => {
  it('accepts any integer >= 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (value) => {
        expect(() => NonNegativeInt(value)).not.toThrow();
        expect(NonNegativeInt(value)).toBe(value);
      })
    );
  });

  it('rejects any integer < 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: -1 }), (value) => {
        expect(() => NonNegativeInt(value)).toThrow();
      })
    );
  });

  it('rejects any non-integer value', () => {
    fc.assert(
      fc.property(
        fc.double({ noDefaultInfinity: false, noNaN: false }).filter((n) => !Number.isInteger(n)),
        (value) => {
          expect(() => NonNegativeInt(value)).toThrow();
        }
      )
    );
  });
});

describe('NonEmptyString — properties', () => {
  it('accepts any string with length >= 1', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (value) => {
        expect(isNonEmptyString(value)).toBe(true);
        expect(() => NonEmptyString(value)).not.toThrow();
        expect(NonEmptyString(value)).toBe(value);
      })
    );
  });

  it('rejects the empty string', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(() => NonEmptyString('')).toThrow();
  });

  it('isNonEmptyString is equivalent to length > 0', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 100 }), (value) => {
        expect(isNonEmptyString(value)).toBe(value.length > 0);
      })
    );
  });
});

describe('IsoTimestamp — properties', () => {
  it('accepts ISO date strings of form YYYY-MM-DD', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{4}-\d{2}-\d{2}$/), (value) => {
        expect(isValidIsoTimestamp(value)).toBe(true);
        expect(() => IsoTimestamp(value)).not.toThrow();
        expect(IsoTimestamp(value)).toBe(value);
      })
    );
  });

  it('accepts ISO datetime with T separator: YYYY-MM-DDTHH:MM:SS', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/), (value) => {
        expect(isValidIsoTimestamp(value)).toBe(true);
        expect(() => IsoTimestamp(value)).not.toThrow();
      })
    );
  });

  it('accepts ISO datetime with space separator and no seconds', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/), (value) => {
        expect(isValidIsoTimestamp(value)).toBe(true);
      })
    );
  });

  it('rejects arbitrary alphabetic strings', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z]+$/, { minLength: 1, maxLength: 20 }), (value) => {
        expect(isValidIsoTimestamp(value)).toBe(false);
        expect(Either.isLeft(IsoTimestamp.either(value))).toBe(true);
      })
    );
  });

  it('isValidIsoTimestamp is consistent with ISO_TIMESTAMP_PATTERN', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (value) => {
        expect(isValidIsoTimestamp(value)).toBe(ISO_TIMESTAMP_PATTERN.test(value));
      })
    );
  });
});

describe('BooleanFlag — properties', () => {
  it('boolean -> flag -> boolean is the identity', () => {
    fc.assert(
      fc.property(fc.boolean(), (value) => {
        expect(fromBooleanFlag(toBooleanFlag(value))).toBe(value);
      })
    );
  });

  it('flag -> boolean -> flag is the identity', () => {
    fc.assert(
      fc.property(fc.constantFrom(0 as const, 1 as const), (value) => {
        expect(toBooleanFlag(fromBooleanFlag(value))).toBe(value);
      })
    );
  });

  it('toBooleanFlag(true) === 1 and toBooleanFlag(false) === 0', () => {
    expect(toBooleanFlag(true)).toBe(1);
    expect(toBooleanFlag(false)).toBe(0);
  });
});
