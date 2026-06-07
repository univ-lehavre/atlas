/**
 * @module brands/token
 * @description REDCap API token branded type with validation.
 *
 * REDCap tokens are 32-character uppercase hexadecimal strings used for API
 * authentication. Schema-as-brand: a single Schema is the source of the type,
 * pattern, predicate, parser and constructor (écart E12, ADR 0047).
 *
 * @example
 * ```typescript
 * import { CrfToken, isValidToken, parseToken } from '@univ-lehavre/atlas-crf-core/brands';
 *
 * const token = CrfToken('A1B2C3D4E5F67890A1B2C3D4E5F67890');
 * if (isValidToken(userInput)) {
 *   // userInput is now typed as CrfToken
 * }
 * const result = parseToken(userInput); // Either<CrfToken, ParseError>
 * ```
 */

import type { Either, ParseResult } from 'effect';
import { makeStringBrand } from './make-string-brand.js';

const token = makeStringBrand('CrfToken', /^[A-F0-9]{32}$/, '32 uppercase hexadecimal characters');

/**
 * REDCap API token (32 uppercase hex characters). Branded so token values are
 * validated at runtime before being used in API calls.
 */
export type CrfToken = typeof token.schema.Type;

/** Pattern for validating REDCap tokens (32 uppercase hex chars). */
export const CRF_TOKEN_PATTERN = token.pattern;

/** The `Schema` source of truth for {@link CrfToken}. */
export const CrfTokenSchema = token.schema;

/** Validate and brand a string as {@link CrfToken} (throws `ParseError` on invalid). */
export const CrfToken = (value: string): CrfToken => token.make(value);

/** Type guard: true when `value` is a valid REDCap token, narrowing to {@link CrfToken}. */
export const isValidToken = (value: string): value is CrfToken => token.is(value);

/** Parse a string as {@link CrfToken}, returning `Either<CrfToken, ParseError>`. */
export const parseToken = (value: string): Either.Either<CrfToken, ParseResult.ParseError> =>
  token.parse(value);

/**
 * Generate a random REDCap-compatible token (testing / mock data). Follows the
 * correct format but is not a real API token.
 */
export const generateToken = (): CrfToken => {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result as CrfToken;
};
