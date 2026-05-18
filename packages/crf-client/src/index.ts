/**
 * @module redcap
 * @description REDCap API client for @univ-lehavre/crf.
 *
 * @example
 * ```typescript
 * import { Effect } from 'effect';
 * import {
 *   createCrfClient,
 *   CrfUrl,
 *   CrfToken
 * } from '@univ-lehavre/crf/redcap';
 *
 * const client = createCrfClient({
 *   url: CrfUrl('https://redcap.example.com/api/'),
 *   token: CrfToken('AABBCCDD11223344AABBCCDD11223344'),
 * });
 *
 * const version = await Effect.runPromise(client.getVersion());
 * ```
 */

// Branded types (values)
export {
  CrfUrl,
  CrfToken,
  RecordId,
  InstrumentName,
  Email,
  UserId,
  PositiveInt,
  NonEmptyString,
  IsoTimestamp,
  // BooleanFlag utilities
  toBooleanFlag,
  fromBooleanFlag,
} from './brands.js';

// Branded types (types)
export type {
  CrfUrl as CrfUrlType,
  CrfToken as CrfTokenType,
  RecordId as RecordIdType,
  InstrumentName as InstrumentNameType,
  Email as EmailType,
  UserId as UserIdType,
  PositiveInt as PositiveIntType,
  NonEmptyString as NonEmptyStringType,
  IsoTimestamp as IsoTimestampType,
  BooleanFlag,
  BooleanFlag as BooleanFlagType,
} from './brands.js';

// Errors
export { CrfHttpError, CrfApiError, CrfNetworkError } from './errors.js';
export type { CrfError } from './errors.js';

// Version utilities
export {
  parseVersion,
  formatVersion,
  compareVersions,
  isVersionAtLeast,
  isVersionLessThan,
  isVersionInRange,
  getMajorVersion,
  SUPPORTED_VERSIONS,
  VersionParseError,
  UnsupportedVersionError,
} from './version.js';
export type { Version, SupportedVersionString } from './version.js';

// Adapters
export {
  getAdapter,
  getAdapterEffect,
  getSupportedVersionRanges,
  isVersionSupported,
  getMinSupportedVersion,
  getLatestAdapter,
} from './adapters/index.js';
export type { CrfAdapter, CrfFeatures, TransformedParams } from './adapters/index.js';

// Types
export type {
  CrfConfig,
  CrfClient,
  CrfClientError,
  ProjectInfo,
  Instrument,
  Field,
  ExportFieldName,
  ImportResult,
  ErrorResponse,
  ExportRecordsOptions,
  ImportRecordsOptions,
} from './types.js';

// Client
export {
  createCrfClient,
  escapeFilterLogicValue,
  makeCrfClientLayer,
  CrfClientService,
} from './client.js';

// Generated types (for advanced usage)
export type { components, operations, paths } from './generated/types.js';
