/**
 * @module brands/token
 * @description REDCap API token branded type with validation.
 *
 * REDCap tokens are 32-character uppercase hexadecimal strings used
 * for API authentication. Each project has a unique token that grants
 * specific permissions.
 *
 * @example
 * ```typescript
 * import { CrfToken, isValidToken, parseToken } from '@univ-lehavre/atlas-crf-core/brands';
 *
 * // Create a validated token
 * const token = CrfToken('A1B2C3D4E5F67890A1B2C3D4E5F67890');
 *
 * // Check if a string is valid
 * if (isValidToken(userInput)) {
 *   // userInput is now typed as CrfToken
 * }
 *
 * // Parse with Either result
 * const result = parseToken(userInput);
 * if (Either.isRight(result)) {
 *   const token = result.right;
 * }
 * ```
 */

import type { Either } from 'effect';
import { Brand } from 'effect';

/**
 * REDCap API token (32 uppercase hex characters).
 *
 * This branded type ensures that token values have been validated
 * at runtime before being used in API calls.
 */
export type CrfToken = string & Brand.Brand<'CrfToken'>;

/**
 * Regular expression pattern for validating REDCap tokens.
 *
 * Matches exactly 32 uppercase hexadecimal characters (0-9, A-F).
 */
export const CRF_TOKEN_PATTERN = /^[A-F0-9]{32}$/;

/**
 * Validate and brand a string as CrfToken.
 *
 * @param value - The string to validate
 * @returns The branded CrfToken
 * @throws {Brand.BrandErrors} If the value is not a valid token format
 *
 * @example
 * ```typescript
 * const token = CrfToken('A1B2C3D4E5F67890A1B2C3D4E5F67890');
 * ```
 */
export const CrfToken = Brand.refined<CrfToken>(
  (value) => CRF_TOKEN_PATTERN.test(value),
  (value) => Brand.error(`Invalid REDCap token format: ${value.slice(0, 8)}...`)
);

/**
 * Check if a string is a valid REDCap token.
 *
 * This function acts as a type guard, narrowing the type to CrfToken
 * when it returns true.
 *
 * @param value - The string to check
 * @returns True if the value is a valid token format
 *
 * @example
 * ```typescript
 * const input: string = getUserInput();
 * if (isValidToken(input)) {
 *   // input is now typed as CrfToken
 *   makeApiCall(input);
 * }
 * ```
 */
export const isValidToken = (value: string): value is CrfToken => CRF_TOKEN_PATTERN.test(value);

/**
 * Parse a string as CrfToken, returning Either.
 *
 * Useful for functional error handling without exceptions.
 *
 * @param value - The string to parse
 * @returns Either.Right with the token if valid, Either.Left with errors if invalid
 *
 * @example
 * ```typescript
 * import { Either } from 'effect';
 *
 * const result = parseToken(userInput);
 * if (Either.isRight(result)) {
 *   console.log('Valid token:', result.right);
 * } else {
 *   console.error('Invalid token');
 * }
 * ```
 */
export const parseToken = (value: string): Either.Either<CrfToken, Brand.Brand.BrandErrors> =>
  CrfToken.either(value);

/**
 * Generate a random REDCap-compatible token.
 *
 * Useful for testing and mock data generation. The generated token
 * follows the correct format but is not a real API token.
 *
 * @returns A valid CrfToken with random content
 *
 * @example
 * ```typescript
 * const mockToken = generateToken();
 * // mockToken is a valid 32-char uppercase hex string
 * ```
 */
export const generateToken = (): CrfToken => {
  const chars = '0123456789ABCDEF';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * 16)];
  }
  return token as CrfToken;
};
