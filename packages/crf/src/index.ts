/**
 * @module crf
 * @description Clinical Research Forms - REDCap client, API server, and CLI tools.
 *
 * @example
 * ```typescript
 * // Import the REDCap client
 * import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/crf/redcap';
 *
 * // Import the server (when available)
 * // import { createServer } from '@univ-lehavre/crf/server';
 * ```
 */

// Re-export redcap module for convenience
export {
  // Branded types (values)
  RedcapUrl,
  RedcapToken,
  RecordId,
  InstrumentName,
  Email,
  UserId,
  PositiveInt,
  NonEmptyString,
  IsoTimestamp,
  toBooleanFlag,
  fromBooleanFlag,
  // Errors
  RedcapHttpError,
  RedcapApiError,
  RedcapNetworkError,
  // Client
  createRedcapClient,
  escapeFilterLogicValue,
  makeRedcapClientLayer,
  RedcapClientService,
} from './redcap/index.js';

export type {
  // Branded types
  RedcapUrlType,
  RedcapTokenType,
  RecordIdType,
  InstrumentNameType,
  EmailType,
  UserIdType,
  PositiveIntType,
  NonEmptyStringType,
  IsoTimestampType,
  BooleanFlag,
  BooleanFlagType,
  // Errors
  RedcapError,
  // Types
  RedcapConfig,
  RedcapClient,
  ProjectInfo,
  Instrument,
  Field,
  ExportFieldName,
  ImportResult,
  ErrorResponse,
  ExportRecordsOptions,
  ImportRecordsOptions,
  // Generated types
  components,
  operations,
  paths,
} from './redcap/index.js';
