/**
 * Generic primitive branded types used across REDCap domain
 */

import type { Either } from 'effect';
import { Brand } from 'effect';

/** Positive integer (>= 1) */
export type PositiveInt = number & Brand.Brand<'PositiveInt'>;

/** Validate and brand a number as PositiveInt */
export const PositiveInt = Brand.refined<PositiveInt>(
  (value) => Number.isInteger(value) && value >= 1,
  (value) => Brand.error(`Expected positive integer, got: ${value}`)
);

/** Check if a number is a positive integer */
export const isPositiveInt = (value: number): value is PositiveInt =>
  Number.isInteger(value) && value >= 1;

/** Parse a number as PositiveInt, returning Either */
export const parsePositiveInt = (
  value: number
): Either.Either<PositiveInt, Brand.Brand.BrandErrors> => PositiveInt.either(value);

/** Non-negative integer (>= 0) */
export type NonNegativeInt = number & Brand.Brand<'NonNegativeInt'>;

/** Validate and brand a number as NonNegativeInt */
export const NonNegativeInt = Brand.refined<NonNegativeInt>(
  (value) => Number.isInteger(value) && value >= 0,
  (value) => Brand.error(`Expected non-negative integer, got: ${value}`)
);

/** Non-empty string */
export type NonEmptyString = string & Brand.Brand<'NonEmptyString'>;

/** Validate and brand a string as NonEmptyString */
export const NonEmptyString = Brand.refined<NonEmptyString>(
  (value) => value.length > 0,
  () => Brand.error('Expected non-empty string')
);

/** Check if a string is non-empty */
export const isNonEmptyString = (value: string): value is NonEmptyString => value.length > 0;

/** ISO timestamp pattern */
export const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/;

/** ISO 8601 timestamp */
export type IsoTimestamp = string & Brand.Brand<'IsoTimestamp'>;

/** Validate and brand a string as IsoTimestamp */
export const IsoTimestamp = Brand.refined<IsoTimestamp>(
  (value) => ISO_TIMESTAMP_PATTERN.test(value),
  (value) => Brand.error(`Invalid ISO timestamp format: ${value}`)
);

/** Check if a string is a valid ISO timestamp */
export const isValidIsoTimestamp = (value: string): value is IsoTimestamp =>
  ISO_TIMESTAMP_PATTERN.test(value);

/** Binary flag (0 or 1) */
export type BooleanFlag = 0 | 1;

/** Convert boolean to BooleanFlag */
export const toBooleanFlag = (value: boolean): BooleanFlag => (value ? 1 : 0);

/** Convert BooleanFlag to boolean */
export const fromBooleanFlag = (value: BooleanFlag): boolean => value === 1;
