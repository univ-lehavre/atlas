/**
 * @module @univ-lehavre/atlas-redcap-core
 * @description Pure functional core for REDCap domain logic with Effect.
 *
 * This package provides the foundation for interacting with REDCap API:
 *
 * - **Branded Types**: Type-safe wrappers for REDCap values (tokens, record IDs, etc.)
 * - **Errors**: Tagged errors for Effect-based error handling
 * - **Version Utilities**: Parsing, comparison, and feature detection by version
 * - **Adapters**: Version-specific behavior adapters (v14, v15, v16)
 * - **Parameters**: API parameter builders for exports/imports
 * - **Validation**: Pattern-based validators for REDCap values
 *
 * @example
 * ```typescript
 * import {
 *   RedcapToken,
 *   parseVersion,
 *   selectAdapter,
 *   buildExportParams,
 * } from '@univ-lehavre/atlas-redcap-core';
 * import { Effect, Option } from 'effect';
 *
 * const program = Effect.gen(function* () {
 *   // Validate token
 *   const token = RedcapToken('A1B2C3D4E5F67890A1B2C3D4E5F67890');
 *
 *   // Parse and check version
 *   const version = yield* parseVersion('15.5.32');
 *   const adapter = selectAdapter(version);
 *
 *   if (Option.isSome(adapter)) {
 *     const features = adapter.value.getFeatures();
 *     console.log('Supports project settings:', features.projectSettings);
 *   }
 *
 *   // Build export parameters
 *   const params = buildExportParams({
 *     fields: ['record_id', 'name'],
 *     filterLogic: '[age] > 18',
 *   });
 *
 *   return params;
 * });
 * ```
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
