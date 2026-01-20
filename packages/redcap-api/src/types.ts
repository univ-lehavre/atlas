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
 * REDCap project information
 */
export interface RedcapProjectInfo {
  readonly project_id: number;
  readonly project_title: string;
  readonly creation_time: string;
  readonly in_production: 0 | 1;
  readonly record_autonumbering_enabled: 0 | 1;
}

/**
 * REDCap instrument metadata
 */
export interface RedcapInstrument {
  readonly instrument_name: string;
  readonly instrument_label: string;
}

/**
 * REDCap field metadata
 */
export interface RedcapField {
  readonly field_name: string;
  readonly form_name: string;
  readonly field_type: string;
  readonly field_label: string;
  readonly select_choices_or_calculations: string;
  readonly field_note: string;
  readonly text_validation_type_or_show_slider_number: string;
  readonly text_validation_min: string;
  readonly text_validation_max: string;
  readonly identifier: string;
  readonly branching_logic: string;
  readonly required_field: string;
  readonly custom_alignment: string;
  readonly question_number: string;
  readonly matrix_group_name: string;
  readonly matrix_ranking: string;
  readonly field_annotation: string;
}

/**
 * REDCap export field name mapping
 * Maps original field names to their export column names
 * (useful for checkbox fields that expand to multiple columns)
 */
export interface RedcapExportFieldName {
  readonly original_field_name: string;
  readonly choice_value: string;
  readonly export_field_name: string;
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
  readonly getVersion: () => Effect.Effect<string, RedcapHttpError | RedcapNetworkError>;

  readonly getProjectInfo: () => Effect.Effect<
    RedcapProjectInfo,
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  readonly getInstruments: () => Effect.Effect<
    readonly RedcapInstrument[],
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  readonly getFields: () => Effect.Effect<
    readonly RedcapField[],
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  readonly getExportFieldNames: () => Effect.Effect<
    readonly RedcapExportFieldName[],
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

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
