/**
 * @module redcap
 * @description REDCap API client for @univ-lehavre/crf.
 *
 * @example
 * ```typescript
 * import { Effect } from 'effect';
 * import {
 *   createRedcapClient,
 *   RedcapUrl,
 *   RedcapToken
 * } from '@univ-lehavre/crf/redcap';
 *
 * const client = createRedcapClient({
 *   url: RedcapUrl('https://redcap.example.com/api/'),
 *   token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
 * });
 *
 * const version = await Effect.runPromise(client.getVersion());
 * ```
 */

// Branded types
export {
  RedcapUrl,
  RedcapToken,
  RecordId,
  InstrumentName,
  Email,
  UserId,
  PositiveInt,
  NonEmptyString,
  IsoTimestamp,
  BooleanFlag,
} from './brands.js';
export type {
  RedcapUrl as RedcapUrlType,
  RedcapToken as RedcapTokenType,
  RecordId as RecordIdType,
  InstrumentName as InstrumentNameType,
  Email as EmailType,
  UserId as UserIdType,
  PositiveInt as PositiveIntType,
  NonEmptyString as NonEmptyStringType,
  IsoTimestamp as IsoTimestampType,
  BooleanFlag as BooleanFlagType,
} from './brands.js';

// Errors
export { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';
export type { RedcapError } from './errors.js';

// Types
export type {
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
} from './types.js';

// Client
export {
  createRedcapClient,
  escapeFilterLogicValue,
  makeRedcapClientLayer,
  RedcapClientService,
} from './client.js';

// Generated types (for advanced usage)
export type { components, operations, paths } from './generated/types.js';
