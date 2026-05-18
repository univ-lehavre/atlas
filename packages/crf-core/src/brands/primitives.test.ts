/**
 * @module brands/primitives.test
 * @description Tests for generic primitive branded types
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
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
import type { BooleanFlag } from './primitives.js';

describe('PositiveInt', () => {
  describe('PositiveInt validator', () => {
    it('should accept positive integers', () => {
      expect(() => PositiveInt(1)).not.toThrow();
      expect(() => PositiveInt(100)).not.toThrow();
      expect(() => PositiveInt(999_999)).not.toThrow();
    });

    it('should return the branded value', () => {
      const value = PositiveInt(42);
      expect(value).toBe(42);
    });

    it('should reject zero', () => {
      expect(() => PositiveInt(0)).toThrow();
    });

    it('should reject negative integers', () => {
      expect(() => PositiveInt(-1)).toThrow();
      expect(() => PositiveInt(-100)).toThrow();
    });

    it('should reject floating point numbers', () => {
      expect(() => PositiveInt(1.5)).toThrow();
      expect(() => PositiveInt(3.14)).toThrow();
    });

    it('should reject NaN', () => {
      expect(() => PositiveInt(Number.NaN)).toThrow();
    });

    it('should reject Infinity', () => {
      expect(() => PositiveInt(Number.POSITIVE_INFINITY)).toThrow();
      expect(() => PositiveInt(Number.NEGATIVE_INFINITY)).toThrow();
    });
  });

  describe('isPositiveInt', () => {
    it('should return true for positive integers', () => {
      expect(isPositiveInt(1)).toBe(true);
      expect(isPositiveInt(100)).toBe(true);
    });

    it('should return false for zero and negative', () => {
      expect(isPositiveInt(0)).toBe(false);
      expect(isPositiveInt(-1)).toBe(false);
    });

    it('should return false for non-integers', () => {
      expect(isPositiveInt(1.5)).toBe(false);
      expect(isPositiveInt(Number.NaN)).toBe(false);
    });

    it('should act as type guard', () => {
      const value: number = 42;
      if (isPositiveInt(value)) {
        const _int: PositiveInt = value;
        expect(_int).toBe(value);
      }
    });
  });

  describe('parsePositiveInt', () => {
    it('should return Right for positive integers', () => {
      const result = parsePositiveInt(42);
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe(42);
      }
    });

    it('should return Left for invalid values', () => {
      expect(Either.isLeft(parsePositiveInt(0))).toBe(true);
      expect(Either.isLeft(parsePositiveInt(-1))).toBe(true);
      expect(Either.isLeft(parsePositiveInt(1.5))).toBe(true);
    });
  });
});

describe('NonNegativeInt', () => {
  describe('NonNegativeInt validator', () => {
    it('should accept zero', () => {
      expect(() => NonNegativeInt(0)).not.toThrow();
    });

    it('should accept positive integers', () => {
      expect(() => NonNegativeInt(1)).not.toThrow();
      expect(() => NonNegativeInt(100)).not.toThrow();
    });

    it('should reject negative integers', () => {
      expect(() => NonNegativeInt(-1)).toThrow();
      expect(() => NonNegativeInt(-100)).toThrow();
    });

    it('should reject floating point numbers', () => {
      expect(() => NonNegativeInt(0.5)).toThrow();
      expect(() => NonNegativeInt(-0.5)).toThrow();
    });
  });
});

describe('NonEmptyString', () => {
  describe('NonEmptyString validator', () => {
    it('should accept non-empty strings', () => {
      expect(() => NonEmptyString('hello')).not.toThrow();
      expect(() => NonEmptyString('a')).not.toThrow();
    });

    it('should accept whitespace-only strings', () => {
      expect(() => NonEmptyString(' ')).not.toThrow();
      expect(() => NonEmptyString('\t')).not.toThrow();
    });

    it('should return the branded value', () => {
      const value = NonEmptyString('test');
      expect(value).toBe('test');
    });

    it('should reject empty string', () => {
      expect(() => NonEmptyString('')).toThrow();
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' ')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = 'hello';
      if (isNonEmptyString(value)) {
        const _str: NonEmptyString = value;
        expect(_str).toBe(value);
      }
    });
  });
});

describe('IsoTimestamp', () => {
  describe('ISO_TIMESTAMP_PATTERN', () => {
    it('should match date only format', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15')).toBe(true);
      expect(ISO_TIMESTAMP_PATTERN.test('2000-12-31')).toBe(true);
    });

    it('should match datetime with T separator', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15T10:30:00')).toBe(true);
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15T23:59:59')).toBe(true);
    });

    it('should match datetime with space separator', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15 10:30:00')).toBe(true);
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15 23:59:59')).toBe(true);
    });

    it('should match datetime without seconds', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15T10:30')).toBe(true);
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15 10:30')).toBe(true);
    });

    it('should not match invalid date formats', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('01/15/2024')).toBe(false);
      expect(ISO_TIMESTAMP_PATTERN.test('15-01-2024')).toBe(false);
      expect(ISO_TIMESTAMP_PATTERN.test('2024/01/15')).toBe(false);
    });

    it('should not match incomplete dates', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01')).toBe(false);
      expect(ISO_TIMESTAMP_PATTERN.test('2024')).toBe(false);
    });

    it('should not match invalid timestamps', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15T10')).toBe(false);
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15T')).toBe(false);
    });

    it('should not match empty string', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('')).toBe(false);
    });
  });

  describe('IsoTimestamp validator', () => {
    it('should accept valid timestamps', () => {
      expect(() => IsoTimestamp('2024-01-15')).not.toThrow();
      expect(() => IsoTimestamp('2024-01-15T10:30:00')).not.toThrow();
      expect(() => IsoTimestamp('2024-01-15 10:30')).not.toThrow();
    });

    it('should return the branded value', () => {
      const value = IsoTimestamp('2024-01-15');
      expect(value).toBe('2024-01-15');
    });

    it('should reject invalid timestamps', () => {
      expect(() => IsoTimestamp('')).toThrow();
      expect(() => IsoTimestamp('invalid')).toThrow();
      expect(() => IsoTimestamp('01/15/2024')).toThrow();
    });
  });

  describe('isValidIsoTimestamp', () => {
    it('should return true for valid timestamps', () => {
      expect(isValidIsoTimestamp('2024-01-15')).toBe(true);
      expect(isValidIsoTimestamp('2024-01-15T10:30:00')).toBe(true);
    });

    it('should return false for invalid timestamps', () => {
      expect(isValidIsoTimestamp('')).toBe(false);
      expect(isValidIsoTimestamp('invalid')).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = '2024-01-15';
      if (isValidIsoTimestamp(value)) {
        const _ts: IsoTimestamp = value;
        expect(_ts).toBe(value);
      }
    });
  });
});

describe('BooleanFlag utilities', () => {
  describe('toBooleanFlag', () => {
    it('should convert true to 1', () => {
      const result: BooleanFlag = toBooleanFlag(true);
      expect(result).toBe(1);
    });

    it('should convert false to 0', () => {
      const result: BooleanFlag = toBooleanFlag(false);
      expect(result).toBe(0);
    });
  });

  describe('fromBooleanFlag', () => {
    it('should convert 1 to true', () => {
      expect(fromBooleanFlag(1)).toBe(true);
    });

    it('should convert 0 to false', () => {
      expect(fromBooleanFlag(0)).toBe(false);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve boolean value through round-trip', () => {
      expect(fromBooleanFlag(toBooleanFlag(true))).toBe(true);
      expect(fromBooleanFlag(toBooleanFlag(false))).toBe(false);
    });

    it('should preserve flag value through round-trip', () => {
      expect(toBooleanFlag(fromBooleanFlag(1))).toBe(1);
      expect(toBooleanFlag(fromBooleanFlag(0))).toBe(0);
    });
  });
});
