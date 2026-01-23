/**
 * @module types
 * @description Type definitions for REDCap API client.
 *
 * This module re-exports generated types from OpenAPI and adds
 * additional interface definitions for the client.
 */
import type { Effect } from 'effect';
import type { components } from './generated/types.js';
import type { RedcapUrl, RedcapToken, RecordId, InstrumentName } from './brands.js';
import type { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';
import type { VersionParseError, UnsupportedVersionError } from './version.js';

// ============================================================================
// Re-export generated types with aliases for convenience
// ============================================================================

export type ProjectInfo = components['schemas']['ProjectInfo'];
export type Instrument = components['schemas']['Instrument'];
export type Field = components['schemas']['Field'];
export type ExportFieldName = components['schemas']['ExportFieldName'];
export type ImportResult = components['schemas']['ImportResult'];
export type ErrorResponse = components['schemas']['ErrorResponse'];

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for REDCap API client.
 */
export interface RedcapConfig {
  readonly url: RedcapUrl;
  readonly token: RedcapToken;
}

// ============================================================================
// Options
// ============================================================================

/**
 * Options for exporting records from REDCap.
 */
export interface ExportRecordsOptions {
  readonly fields?: readonly string[];
  readonly forms?: readonly string[];
  readonly filterLogic?: string;
  readonly type?: 'flat' | 'eav';
  readonly rawOrLabel?: 'raw' | 'label';
}

/**
 * Options for importing records into REDCap.
 */
export interface ImportRecordsOptions {
  readonly overwriteBehavior?: 'normal' | 'overwrite';
  readonly returnContent?: 'count' | 'ids' | 'auto_ids';
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * All possible errors from the REDCap client.
 */
export type RedcapClientError =
  | RedcapHttpError
  | RedcapApiError
  | RedcapNetworkError
  | VersionParseError
  | UnsupportedVersionError;

// ============================================================================
// Client Interface
// ============================================================================

/**
 * REDCap API client interface.
 *
 * The client automatically detects the REDCap server version and adapts
 * its requests accordingly. Methods that require version-specific behavior
 * may fail with VersionParseError or UnsupportedVersionError.
 */
export interface RedcapClient {
  readonly getVersion: () => Effect.Effect<string, RedcapHttpError | RedcapNetworkError>;

  readonly getProjectInfo: () => Effect.Effect<ProjectInfo, RedcapClientError>;

  readonly getInstruments: () => Effect.Effect<
    readonly Instrument[],
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  readonly getFields: () => Effect.Effect<
    readonly Field[],
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  readonly getExportFieldNames: () => Effect.Effect<
    readonly ExportFieldName[],
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  readonly exportRecords: <T>(
    options?: ExportRecordsOptions
  ) => Effect.Effect<readonly T[], RedcapClientError>;

  readonly importRecords: (
    records: readonly Record<string, unknown>[],
    options?: ImportRecordsOptions
  ) => Effect.Effect<ImportResult, RedcapClientError>;

  readonly getSurveyLink: (
    record: RecordId,
    instrument: InstrumentName
  ) => Effect.Effect<string, RedcapHttpError | RedcapNetworkError>;

  readonly downloadPdf: (
    recordId: RecordId,
    instrument: InstrumentName
  ) => Effect.Effect<ArrayBuffer, RedcapHttpError | RedcapNetworkError>;

  readonly findUserIdByEmail: (email: string) => Effect.Effect<string | null, RedcapClientError>;
}
