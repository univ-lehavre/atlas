import { Schema as S } from 'effect';

/**
 * Configuration for REDCap API client
 */
export interface RedcapConfig {
  /** REDCap API URL */
  readonly url: string;
  /** REDCap API token */
  readonly token: string;
}

/**
 * REDCap API default parameters for record export
 */
export interface RedcapExportParams {
  content?: string;
  action?: string;
  format?: string;
  type?: 'flat' | 'eav';
  csvDelimiter?: string;
  records?: string;
  fields?: string;
  forms?: string;
  rawOrLabel?: 'raw' | 'label';
  rawOrLabelHeaders?: 'raw' | 'label';
  exportCheckboxLabel?: string;
  exportSurveyFields?: string;
  exportDataAccessGroups?: string;
  returnFormat?: string;
  filterLogic?: string;
}

/**
 * REDCap API import parameters
 */
export interface RedcapImportParams {
  content?: string;
  action?: 'import';
  type?: 'flat' | 'eav';
  overwriteBehavior?: 'normal' | 'overwrite';
  forceAutoNumber?: string;
  data?: string;
  returnContent?: 'count' | 'ids' | 'auto_ids';
}

/**
 * Generic record type for REDCap data
 * Uses passthrough to allow additional fields
 */
export const RecordSchema = S.Struct({
  record_id: S.String,
}).pipe(S.extend(S.Record({ key: S.String, value: S.Unknown })));

export type Record = S.Schema.Type<typeof RecordSchema>;

/**
 * REDCap import response
 */
export const ImportResponseSchema = S.Struct({
  count: S.Number,
});

export type ImportResponse = S.Schema.Type<typeof ImportResponseSchema>;

/**
 * REDCap error response (returned with 200 status)
 */
export interface RedcapErrorResponse {
  error: string;
}
