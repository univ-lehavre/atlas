import type { Effect } from 'effect';
import type { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';
import type { RedcapUrl, RedcapToken, RecordId, InstrumentName } from './brands.js';

/**
 * Configuration for REDCap API client
 */
export interface RedcapConfig {
  readonly url: RedcapUrl;
  readonly token: RedcapToken;
}

/**
 * Export options for records
 */
export interface ExportRecordsOptions {
  readonly fields?: readonly string[];
  readonly forms?: readonly string[];
  readonly filterLogic?: string;
  readonly type?: 'flat' | 'eav';
  readonly rawOrLabel?: 'raw' | 'label';
}

/**
 * Import options for records
 */
export interface ImportRecordsOptions {
  readonly overwriteBehavior?: 'normal' | 'overwrite';
  readonly returnContent?: 'count' | 'ids' | 'auto_ids';
}

/**
 * REDCap Client Service interface
 */
export interface RedcapClient {
  readonly exportRecords: <T>(
    options?: ExportRecordsOptions
  ) => Effect.Effect<readonly T[], RedcapHttpError | RedcapApiError | RedcapNetworkError>;

  readonly importRecords: (
    records: readonly Record<string, unknown>[],
    options?: ImportRecordsOptions
  ) => Effect.Effect<
    { readonly count: number },
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  readonly getSurveyLink: (
    record: RecordId,
    instrument: InstrumentName
  ) => Effect.Effect<string, RedcapHttpError | RedcapNetworkError>;

  readonly downloadPdf: (
    recordId: RecordId,
    instrument: InstrumentName
  ) => Effect.Effect<ArrayBuffer, RedcapHttpError | RedcapNetworkError>;

  readonly findUserIdByEmail: (
    email: string
  ) => Effect.Effect<string | null, RedcapHttpError | RedcapApiError | RedcapNetworkError>;
}
