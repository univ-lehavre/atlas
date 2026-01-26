/**
 * REDCap Core
 *
 * Pure functional core for REDCap domain logic with Effect.
 *
 * @packageDocumentation
 */

// Branded types - export all
export * from './brands/index.js';

// Errors
export {
  RedcapHttpError,
  fromResponse,
  RedcapApiError,
  parseApiError,
  isApiErrorResponse,
  RedcapNetworkError,
  fromException,
  VersionParseError,
  UnsupportedVersionError,
} from './errors/index.js';

export type { RedcapClientError, RedcapError } from './errors/index.js';

// Version
export * from './version/index.js';

// Content types
export * from './content-types/index.js';

// Parameters
export * from './params/index.js';

// Adapters
export * from './adapters/index.js';

// Validation
export {
  TOKEN_PATTERN,
  REDCAP_NAME_PATTERN,
  DATE_PATTERN,
  DATETIME_PATTERN,
  TIME_PATTERN,
  INTEGER_PATTERN,
  NUMBER_PATTERN,
  URL_PATTERN,
  PHONE_PATTERN,
  ZIPCODE_PATTERN,
  isValidToken as validateToken,
  isValidRedcapName,
  isValidDate,
  isValidDatetime,
  isValidTime,
  isValidInteger,
  isValidNumber,
  isValidUrl,
  isInRange,
  isValidLength,
} from './validation/index.js';

// Utils
export * from './utils/index.js';

// Types
export * from './types/index.js';
