import { Effect, Brand } from 'effect';

/**
 * Parses a URL safely, returning null if invalid
 * @param url - The URL string to parse
 * @returns The parsed URL or null if invalid
 */
const parseUrl = (url: string): URL | null =>
  Effect.runSync(
    Effect.try({
      try: () => new URL(url),
      catch: () => null,
    })
  );

/**
 * Validates that a parsed URL is safe for REDCap API usage
 * @param parsed - The parsed URL object
 * @returns True if the URL is safe
 */
const isUrlSafe = (parsed: URL): boolean =>
  (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
  parsed.username === '' &&
  parsed.password === '' &&
  parsed.hostname !== '' &&
  parsed.search === '' &&
  parsed.hash === '';

/**
 * Validates that a string is a safe REDCap API URL
 * @param url - The URL string to validate
 * @returns True if valid and safe
 */
const isValidRedcapUrl = (url: string): boolean => {
  const parsed = parseUrl(url);
  return parsed !== null && isUrlSafe(parsed);
};

/**
 * Branded type for REDCap API URL
 * Must be a valid, safe URL (https/http, no credentials, no query string, no fragments)
 */
export type RedcapUrl = string & Brand.Brand<'RedcapUrl'>;
export const RedcapUrl = Brand.refined<RedcapUrl>(isValidRedcapUrl, (url) =>
  Brand.error(
    `Invalid REDCap URL: "${url}" must be a valid URL without credentials, query string, or fragments`
  )
);

/**
 * Branded type for REDCap API token
 * Must be a 32-character uppercase hexadecimal string
 */
export type RedcapToken = string & Brand.Brand<'RedcapToken'>;
export const RedcapToken = Brand.refined<RedcapToken>(
  (token) => /^[A-F0-9]{32}$/.test(token),
  () => Brand.error('Invalid REDCap token: must be a 32-character uppercase hexadecimal string')
);

/**
 * Branded type for REDCap record IDs
 * Must be a valid Appwrite ID (alphanumeric, at least 20 characters)
 */
export type RecordId = string & Brand.Brand<'RecordId'>;
export const RecordId = Brand.refined<RecordId>(
  (id) => /^[a-zA-Z0-9]{20,}$/.test(id),
  (id) =>
    Brand.error(
      `Invalid Record ID: "${id}" must be an alphanumeric string of at least 20 characters`
    )
);

/**
 * Branded type for REDCap instrument names
 * Must be a non-empty string matching REDCap naming convention (lowercase, underscores)
 */
export type InstrumentName = string & Brand.Brand<'InstrumentName'>;
export const InstrumentName = Brand.refined<InstrumentName>(
  (name) => /^[a-z][a-z0-9_]*$/.test(name),
  (name) => Brand.error(`Invalid instrument name: "${name}" must be lowercase with underscores`)
);
