/**
 * REDCap user-related branded types (UserId, Email).
 *
 * Schema-as-brand: a single Schema is the source of the type, pattern,
 * predicate, parser and constructor (écart E12, ADR 0047).
 */

import type { Either, ParseResult } from 'effect';
import { makeStringBrand } from './make-string-brand.js';

const user = makeStringBrand(
  'UserId',
  /^\w+$/,
  'alphanumeric and underscores, at least 1 character'
);

/** REDCap user ID (username). */
export type UserId = typeof user.schema.Type;

/** User ID validation pattern (alphanumeric and underscores). */
export const USER_ID_PATTERN = user.pattern;

/** The `Schema` source of truth for {@link UserId}. */
export const UserIdSchema = user.schema;

/** Validate and brand a string as {@link UserId} (throws on invalid). */
export const UserId = (value: string): UserId => user.make(value);

/** Check if a string is a valid user ID. */
export const isValidUserId = (value: string): value is UserId => user.is(value);

/** Parse a string as {@link UserId}, returning `Either`. */
export const parseUserId = (value: string): Either.Either<UserId, ParseResult.ParseError> =>
  user.parse(value);

const email = makeStringBrand(
  'Email',
  /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/,
  'a valid email address'
);

/** Email address. */
export type Email = typeof email.schema.Type;

/** Email validation pattern. */
export const EMAIL_PATTERN = email.pattern;

/** The `Schema` source of truth for {@link Email}. */
export const EmailSchema = email.schema;

/** Validate and brand a string as {@link Email} (throws on invalid). */
export const Email = (value: string): Email => email.make(value);

/** Check if a string is a valid email. */
export const isValidEmail = (value: string): value is Email => email.is(value);

/** Parse a string as {@link Email}, returning `Either`. */
export const parseEmail = (value: string): Either.Either<Email, ParseResult.ParseError> =>
  email.parse(value);
