/**
 * REDCap configuration types
 */

import type { RedcapToken } from '../brands/token.js';

/** REDCap API configuration */
export interface RedcapConfig {
  /** REDCap API URL (must end with /api/) */
  readonly url: string;
  /** API token */
  readonly token: RedcapToken;
  /** Request timeout in milliseconds */
  readonly timeout?: number;
  /** Custom fetch implementation */
  readonly fetch?: typeof fetch;
}

/** Options for exporting records */
export interface ExportRecordsOptions {
  /** Record IDs to export (empty = all) */
  readonly records?: readonly string[];
  /** Field names to export (empty = all) */
  readonly fields?: readonly string[];
  /** Form names to export (empty = all) */
  readonly forms?: readonly string[];
  /** Event names to export (longitudinal only) */
  readonly events?: readonly string[];
  /** Filter logic expression */
  readonly filterLogic?: string;
  /** Export format: flat (one row per record) or eav (one row per data point) */
  readonly type?: 'flat' | 'eav';
  /** Return raw values or labels */
  readonly rawOrLabel?: 'raw' | 'label';
  /** Return raw or label headers */
  readonly rawOrLabelHeaders?: 'raw' | 'label';
  /** Export checkbox labels instead of 0/1 */
  readonly exportCheckboxLabel?: boolean;
  /** Include survey fields (survey timestamp, etc.) */
  readonly exportSurveyFields?: boolean;
  /** Include Data Access Group assignment */
  readonly exportDataAccessGroups?: boolean;
  /** Beginning of date range filter */
  readonly dateRangeBegin?: string;
  /** End of date range filter */
  readonly dateRangeEnd?: string;
}

/** Options for importing records */
export interface ImportRecordsOptions {
  /** Import format */
  readonly type?: 'flat' | 'eav';
  /** Overwrite behavior */
  readonly overwriteBehavior?: 'normal' | 'overwrite';
  /** Force auto-numbering */
  readonly forceAutoNumber?: boolean;
  /** What to return after import */
  readonly returnContent?: 'count' | 'ids' | 'auto_ids' | 'nothing';
  /** Date format in import data */
  readonly dateFormat?: 'YMD' | 'MDY' | 'DMY';
}

/** Options for exporting files */
export interface ExportFileOptions {
  /** Record ID */
  readonly record: string;
  /** Field name containing the file */
  readonly field: string;
  /** Event name (longitudinal only) */
  readonly event?: string;
  /** Repeat instance number */
  readonly repeatInstance?: number;
}

/** Options for importing files */
export interface ImportFileOptions extends ExportFileOptions {
  /** File name */
  readonly fileName: string;
  /** File content */
  readonly fileContent: Blob | Buffer;
}
