/**
 * REDCap API token branded type
 *
 * REDCap tokens are 32-character uppercase hexadecimal strings.
 */

import type { Either } from 'effect';
import { Brand } from 'effect';

/** REDCap API token (32 uppercase hex characters) */
export type RedcapToken = string & Brand.Brand<'RedcapToken'>;

/** Token validation pattern */
export const REDCAP_TOKEN_PATTERN = /^[A-F0-9]{32}$/;

/** Validate and brand a string as RedcapToken */
export const RedcapToken = Brand.refined<RedcapToken>(
  (value) => REDCAP_TOKEN_PATTERN.test(value),
  (value) => Brand.error(`Invalid REDCap token format: ${value.slice(0, 8)}...`)
);

/** Check if a string is a valid REDCap token */
export const isValidToken = (value: string): value is RedcapToken =>
  REDCAP_TOKEN_PATTERN.test(value);

/** Parse a string as RedcapToken, returning Either */
export const parseToken = (value: string): Either.Either<RedcapToken, Brand.Brand.BrandErrors> =>
  RedcapToken.either(value);

/** Generate a random REDCap-compatible token (for testing) */
export const generateToken = (): RedcapToken => {
  const chars = '0123456789ABCDEF';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * 16)];
  }
  return token as RedcapToken;
};
