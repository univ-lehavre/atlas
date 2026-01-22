/**
 * @module brands
 * @description Branded types for REDCap API ensuring type-safe validation at compile time.
 *
 * This module provides branded types using Effect's Brand module to create
 * nominal types that enforce validation rules at runtime while providing
 * type safety at compile time.
 *
 * @example
 * ```typescript
 * import { RedcapUrl, RedcapToken, RecordId, InstrumentName } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Valid branded values
 * const url = RedcapUrl('https://redcap.example.com/api/');
 * const token = RedcapToken('A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4');
 * const recordId = RecordId('abc12345678901234567');
 * const instrument = InstrumentName('my_survey');
 *
 * // Invalid values throw BrandError
 * RedcapUrl('not-a-url'); // throws
 * RedcapToken('invalid'); // throws
 * ```
 */
import { Effect, Brand } from 'effect';

/**
 * Parses a URL safely, returning null if invalid.
 *
 * Uses Effect.try to safely parse a URL string without throwing exceptions.
 * This is an internal utility function used by the URL validation logic.
 *
 * @internal
 * @param url - The URL string to parse
 * @returns The parsed URL object if valid, or null if parsing fails
 *
 * @example
 * ```typescript
 * parseUrl('https://example.com'); // URL object
 * parseUrl('not-a-url');           // null
 * ```
 */
const parseUrl = (url: string): URL | null =>
  Effect.runSync(
    Effect.try({
      try: () => new URL(url),
      catch: () => null,
    })
  );

/**
 * Validates that a parsed URL is safe for REDCap API usage.
 *
 * Checks that the URL meets security requirements:
 * - Uses HTTP or HTTPS protocol only
 * - Does not contain embedded credentials (username/password)
 * - Has a non-empty hostname
 * - Does not contain query strings or hash fragments
 *
 * @internal
 * @param parsed - The parsed URL object to validate
 * @returns True if the URL passes all safety checks
 *
 * @example
 * ```typescript
 * isUrlSafe(new URL('https://redcap.example.com/api/')); // true
 * isUrlSafe(new URL('https://user:pass@example.com'));   // false (credentials)
 * isUrlSafe(new URL('ftp://example.com'));               // false (wrong protocol)
 * ```
 */
const isUrlSafe = (parsed: URL): boolean =>
  (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
  parsed.username === '' &&
  parsed.password === '' &&
  parsed.hostname !== '' &&
  parsed.search === '' &&
  parsed.hash === '';

/**
 * Validates that a string is a safe REDCap API URL.
 *
 * Combines URL parsing and safety validation into a single check.
 * This is the main validation function used by the RedcapUrl branded type.
 *
 * @internal
 * @param url - The URL string to validate
 * @returns True if the URL is valid and safe for REDCap API usage
 *
 * @example
 * ```typescript
 * isValidRedcapUrl('https://redcap.example.com/api/'); // true
 * isValidRedcapUrl('invalid-url');                      // false
 * isValidRedcapUrl('https://user:pass@example.com');    // false
 * ```
 */
const isValidRedcapUrl = (url: string): boolean => {
  const parsed = parseUrl(url);
  return parsed !== null && isUrlSafe(parsed);
};

/**
 * Branded type for REDCap API URL.
 *
 * Ensures URLs are valid and safe for REDCap API communication.
 * The URL must meet the following requirements:
 * - Valid URL format parseable by the URL constructor
 * - HTTP or HTTPS protocol only
 * - No embedded credentials (username/password in URL)
 * - Non-empty hostname
 * - No query string parameters (REDCap uses POST body for params)
 * - No URL fragments
 *
 * @example
 * ```typescript
 * // Valid URLs
 * const url1 = RedcapUrl('https://redcap.example.com/api/');
 * const url2 = RedcapUrl('http://localhost:8080/redcap/api/');
 *
 * // Invalid URLs throw BrandError
 * RedcapUrl('ftp://example.com');           // wrong protocol
 * RedcapUrl('https://user:pass@example.com'); // credentials in URL
 * RedcapUrl('https://example.com?token=x'); // query string not allowed
 * RedcapUrl('not-a-url');                   // invalid URL format
 * ```
 *
 * @throws {Brand.BrandError} When the URL is invalid or fails security checks
 */
export type RedcapUrl = string & Brand.Brand<'RedcapUrl'>;

/**
 * Constructor function for RedcapUrl branded type.
 *
 * Validates and brands a string as a RedcapUrl. Throws if validation fails.
 *
 * @param url - The URL string to validate and brand
 * @returns The validated RedcapUrl
 * @throws {Brand.BrandError} When the URL is invalid
 */
export const RedcapUrl = Brand.refined<RedcapUrl>(isValidRedcapUrl, (url) =>
  Brand.error(
    `Invalid REDCap URL: "${url}" must be a valid URL without credentials, query string, or fragments`
  )
);

/**
 * Branded type for REDCap API token.
 *
 * REDCap API tokens are 32-character hexadecimal strings (uppercase A-F, 0-9).
 * These tokens are used to authenticate API requests and should be treated
 * as sensitive credentials.
 *
 * @example
 * ```typescript
 * // Valid token (32 uppercase hex characters)
 * const token = RedcapToken('AABBCCDD11223344AABBCCDD11223344');
 *
 * // Invalid tokens throw BrandError
 * RedcapToken('abc');                               // too short
 * RedcapToken('e1b217963ccee21ef78322345b3b8782'); // lowercase not allowed
 * RedcapToken('G1B217963CCEE21EF78322345B3B8782'); // 'G' not valid hex
 * ```
 *
 * @throws {Brand.BrandError} When the token format is invalid
 */
export type RedcapToken = string & Brand.Brand<'RedcapToken'>;

/**
 * Constructor function for RedcapToken branded type.
 *
 * Validates that the token is exactly 32 uppercase hexadecimal characters.
 *
 * @param token - The token string to validate and brand
 * @returns The validated RedcapToken
 * @throws {Brand.BrandError} When the token format is invalid
 */
export const RedcapToken = Brand.refined<RedcapToken>(
  (token) => /^[A-F0-9]{32}$/.test(token),
  () => Brand.error('Invalid REDCap token: must be a 32-character uppercase hexadecimal string')
);

/**
 * Branded type for REDCap record IDs.
 *
 * Record IDs must be alphanumeric strings of at least 20 characters.
 * This format is compatible with Appwrite-style IDs commonly used
 * in the Atlas project.
 *
 * @example
 * ```typescript
 * // Valid record IDs (alphanumeric, 20+ characters)
 * const id1 = RecordId('abc12345678901234567');
 * const id2 = RecordId('ABC12345678901234567890');
 *
 * // Invalid record IDs throw BrandError
 * RecordId('short');                  // too short (less than 20 chars)
 * RecordId('abc-123-456-789-012'); // hyphens not allowed
 * RecordId('abc_123_456_789_012'); // underscores not allowed
 * ```
 *
 * @throws {Brand.BrandError} When the record ID format is invalid
 */
export type RecordId = string & Brand.Brand<'RecordId'>;

/**
 * Constructor function for RecordId branded type.
 *
 * Validates that the ID is alphanumeric and at least 20 characters long.
 *
 * @param id - The record ID string to validate and brand
 * @returns The validated RecordId
 * @throws {Brand.BrandError} When the record ID format is invalid
 */
export const RecordId = Brand.refined<RecordId>(
  (id) => /^[a-z0-9]{20,}$/i.test(id),
  (id) =>
    Brand.error(
      `Invalid Record ID: "${id}" must be an alphanumeric string of at least 20 characters`
    )
);

/**
 * Branded type for REDCap instrument names.
 *
 * Instrument names follow REDCap's naming convention:
 * - Must start with a lowercase letter
 * - Can contain lowercase letters, digits, and underscores
 * - Typically matches the `instrument_name` field from REDCap metadata
 *
 * @example
 * ```typescript
 * // Valid instrument names
 * const inst1 = InstrumentName('my_survey');
 * const inst2 = InstrumentName('demographics');
 * const inst3 = InstrumentName('visit_1_form');
 *
 * // Invalid instrument names throw BrandError
 * InstrumentName('My_Survey');    // uppercase not allowed
 * InstrumentName('1_survey');     // cannot start with digit
 * InstrumentName('my-survey');    // hyphens not allowed
 * InstrumentName('');             // empty string not allowed
 * ```
 *
 * @throws {Brand.BrandError} When the instrument name format is invalid
 */
export type InstrumentName = string & Brand.Brand<'InstrumentName'>;

/**
 * Constructor function for InstrumentName branded type.
 *
 * Validates that the name follows REDCap's instrument naming convention.
 *
 * @param name - The instrument name string to validate and brand
 * @returns The validated InstrumentName
 * @throws {Brand.BrandError} When the instrument name format is invalid
 */
export const InstrumentName = Brand.refined<InstrumentName>(
  (name) => /^[a-z][a-z0-9_]*$/.test(name),
  (name) => Brand.error(`Invalid instrument name: "${name}" must be lowercase with underscores`)
);
