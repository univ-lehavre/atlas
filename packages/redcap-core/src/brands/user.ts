/**
 * REDCap user-related branded types
 */

import type { Either } from 'effect';
import { Brand } from 'effect';

/** REDCap user ID (username) */
export type UserId = string & Brand.Brand<'UserId'>;

/** User ID validation pattern (alphanumeric and underscores) */
export const USER_ID_PATTERN = /^\w+$/;

/** Validate and brand a string as UserId */
export const UserId = Brand.refined<UserId>(
  (value) => value.length > 0 && USER_ID_PATTERN.test(value),
  (value) => Brand.error(`Invalid user ID format: ${value}`)
);

/** Check if a string is a valid user ID */
export const isValidUserId = (value: string): value is UserId =>
  value.length > 0 && USER_ID_PATTERN.test(value);

/** Parse a string as UserId, returning Either */
export const parseUserId = (value: string): Either.Either<UserId, Brand.Brand.BrandErrors> =>
  UserId.either(value);

/** Email address */
export type Email = string & Brand.Brand<'Email'>;

/** Email validation pattern */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

/** Validate and brand a string as Email */
export const Email = Brand.refined<Email>(
  (value) => EMAIL_PATTERN.test(value),
  (value) => Brand.error(`Invalid email format: ${value}`)
);

/** Check if a string is a valid email */
export const isValidEmail = (value: string): value is Email => EMAIL_PATTERN.test(value);

/** Parse a string as Email, returning Either */
export const parseEmail = (value: string): Either.Either<Email, Brand.Brand.BrandErrors> =>
  Email.either(value);
