/**
 * @module types
 * @description Type definitions for REDCap API client.
 *
 * This module contains all TypeScript interfaces and types used by the REDCap API client.
 * It defines configuration structures, API response shapes, and the main client interface.
 *
 * @example
 * ```typescript
 * import type {
 *   RedcapConfig,
 *   RedcapClient,
 *   RedcapProjectInfo,
 *   ExportRecordsOptions
 * } from '@univ-lehavre/atlas-redcap-api';
 * ```
 */
import type { Effect } from 'effect';
import type { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';
import type { RedcapUrl, RedcapToken, RecordId, InstrumentName } from './brands.js';

/**
 * Configuration for REDCap API client.
 *
 * Contains the required credentials to connect to a REDCap instance.
 * Both values are branded types that enforce validation at runtime.
 *
 * @example
 * ```typescript
 * import { RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';
 * import type { RedcapConfig } from '@univ-lehavre/atlas-redcap-api';
 *
 * const config: RedcapConfig = {
 *   url: RedcapUrl('https://redcap.example.com/api/'),
 *   token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
 * };
 * ```
 *
 * @property {RedcapUrl} url - The REDCap API endpoint URL
 * @property {RedcapToken} token - The API token for authentication
 */
export interface RedcapConfig {
  /** The REDCap API endpoint URL (validated and branded) */
  readonly url: RedcapUrl;
  /** The API token for authentication (validated and branded) */
  readonly token: RedcapToken;
}

/**
 * REDCap project information returned by the API.
 *
 * Contains metadata about a REDCap project including its ID, title,
 * creation timestamp, and configuration flags.
 *
 * @example
 * ```typescript
 * const info = await Effect.runPromise(client.getProjectInfo());
 * console.log(`Project: ${info.project_title} (ID: ${info.project_id})`);
 * console.log(`In production: ${info.in_production === 1}`);
 * ```
 *
 * @see {@link RedcapClient.getProjectInfo} - Method that returns this type
 */
export interface RedcapProjectInfo {
  /** Unique identifier for the project in REDCap */
  readonly project_id: number;
  /** Human-readable title of the project */
  readonly project_title: string;
  /** ISO 8601 timestamp when the project was created */
  readonly creation_time: string;
  /** Whether the project is in production mode (1) or development mode (0) */
  readonly in_production: 0 | 1;
  /** Whether automatic record numbering is enabled (1) or disabled (0) */
  readonly record_autonumbering_enabled: 0 | 1;
}

/**
 * REDCap instrument (form) metadata.
 *
 * Represents a data collection instrument/form in a REDCap project.
 * Each project can have multiple instruments.
 *
 * @example
 * ```typescript
 * const instruments = await Effect.runPromise(client.getInstruments());
 * instruments.forEach(inst => {
 *   console.log(`${inst.instrument_label} (${inst.instrument_name})`);
 * });
 * ```
 *
 * @see {@link RedcapClient.getInstruments} - Method that returns this type
 */
export interface RedcapInstrument {
  /** Internal name used in the API (lowercase, underscores, e.g., 'demographics') */
  readonly instrument_name: string;
  /** Human-readable display label (e.g., 'Demographics Form') */
  readonly instrument_label: string;
}

/**
 * REDCap field metadata from the data dictionary.
 *
 * Contains complete metadata for a single field in the project's data dictionary.
 * This includes field type, validation rules, branching logic, and display options.
 *
 * @example
 * ```typescript
 * const fields = await Effect.runPromise(client.getFields());
 * const requiredFields = fields.filter(f => f.required_field === 'y');
 * const emailFields = fields.filter(f =>
 *   f.text_validation_type_or_show_slider_number === 'email'
 * );
 * ```
 *
 * @see {@link RedcapClient.getFields} - Method that returns this type
 */
export interface RedcapField {
  /** Unique identifier for the field (variable name) */
  readonly field_name: string;
  /** Name of the instrument/form containing this field */
  readonly form_name: string;
  /** Field type: 'text', 'textarea', 'calc', 'dropdown', 'radio', 'checkbox', etc. */
  readonly field_type: string;
  /** Display label shown to users */
  readonly field_label: string;
  /** For choice fields: pipe-separated values (e.g., '1, Yes | 2, No'); for calc fields: formula */
  readonly select_choices_or_calculations: string;
  /** Additional note/instructions displayed below the field */
  readonly field_note: string;
  /** Validation type: 'email', 'integer', 'number', 'date_ymd', etc., or slider position */
  readonly text_validation_type_or_show_slider_number: string;
  /** Minimum allowed value for validated numeric/date fields */
  readonly text_validation_min: string;
  /** Maximum allowed value for validated numeric/date fields */
  readonly text_validation_max: string;
  /** Whether field contains identifying information: 'y' or '' */
  readonly identifier: string;
  /** Branching logic expression controlling field visibility */
  readonly branching_logic: string;
  /** Whether field is required: 'y' or '' */
  readonly required_field: string;
  /** Custom alignment: 'LH', 'LV', 'RH', 'RV', or '' */
  readonly custom_alignment: string;
  /** Question number for display purposes */
  readonly question_number: string;
  /** Matrix group name if field is part of a matrix */
  readonly matrix_group_name: string;
  /** Matrix ranking option */
  readonly matrix_ranking: string;
  /** Action tags and other annotations (e.g., '@HIDDEN', '@DEFAULT') */
  readonly field_annotation: string;
}

/**
 * REDCap export field name mapping.
 *
 * Maps original field names to their export column names. This is particularly
 * useful for checkbox fields, which expand to multiple columns in exports
 * (one per choice option).
 *
 * @example
 * ```typescript
 * const fieldNames = await Effect.runPromise(client.getExportFieldNames());
 *
 * // Checkbox 'symptoms' with options 1,2,3 becomes:
 * // symptoms___1, symptoms___2, symptoms___3
 * const symptomColumns = fieldNames
 *   .filter(f => f.original_field_name === 'symptoms')
 *   .map(f => f.export_field_name);
 * ```
 *
 * @see {@link RedcapClient.getExportFieldNames} - Method that returns this type
 */
export interface RedcapExportFieldName {
  /** Original field name from the data dictionary */
  readonly original_field_name: string;
  /** For checkbox fields: the choice value; empty for other field types */
  readonly choice_value: string;
  /** The actual column name used in exports (e.g., 'symptoms___1') */
  readonly export_field_name: string;
}

/**
 * Options for exporting records from REDCap.
 *
 * Allows filtering and customizing the export of record data.
 * All options are optional - omitting them returns all records with all fields.
 *
 * @example
 * ```typescript
 * // Export specific fields for records matching a filter
 * const options: ExportRecordsOptions = {
 *   fields: ['record_id', 'first_name', 'last_name', 'email'],
 *   filterLogic: '[age] >= 18',
 *   rawOrLabel: 'label', // Get labels instead of raw codes
 * };
 *
 * const records = await Effect.runPromise(
 *   client.exportRecords<{ record_id: string; first_name: string }>(options)
 * );
 * ```
 *
 * @see {@link RedcapClient.exportRecords} - Method that uses this type
 * @see {@link escapeFilterLogicValue} - Utility for safely escaping filterLogic values
 */
export interface ExportRecordsOptions {
  /** List of field names to include; omit for all fields */
  readonly fields?: readonly string[];
  /** List of form/instrument names to include; omit for all forms */
  readonly forms?: readonly string[];
  /**
   * REDCap filter logic expression (e.g., '[age] >= 18 AND [consent] = "1"').
   * Use {@link escapeFilterLogicValue} when including user input.
   */
  readonly filterLogic?: string;
  /**
   * Export format:
   * - 'flat': One row per record (default)
   * - 'eav': Entity-Attribute-Value format (one row per data point)
   */
  readonly type?: 'flat' | 'eav';
  /**
   * Value format for choice fields:
   * - 'raw': Return coded values (e.g., '1', '2')
   * - 'label': Return display labels (e.g., 'Yes', 'No')
   */
  readonly rawOrLabel?: 'raw' | 'label';
}

/**
 * Options for importing records into REDCap.
 *
 * Controls how imported records are handled, including overwrite behavior
 * and what data is returned after import.
 *
 * @example
 * ```typescript
 * // Import with overwrite and get back record IDs
 * const options: ImportRecordsOptions = {
 *   overwriteBehavior: 'overwrite',
 *   returnContent: 'ids',
 * };
 *
 * const result = await Effect.runPromise(
 *   client.importRecords(records, options)
 * );
 * console.log(`Imported ${result.count} records`);
 * ```
 *
 * @see {@link RedcapClient.importRecords} - Method that uses this type
 */
export interface ImportRecordsOptions {
  /**
   * How to handle existing data:
   * - 'normal': Only overwrite fields that have new values (default)
   * - 'overwrite': Overwrite all fields, setting blank fields to empty
   */
  readonly overwriteBehavior?: 'normal' | 'overwrite';
  /**
   * What to return after import:
   * - 'count': Return count of imported records (default)
   * - 'ids': Return list of record IDs that were imported
   * - 'auto_ids': Return auto-generated record IDs (if autonumbering enabled)
   */
  readonly returnContent?: 'count' | 'ids' | 'auto_ids';
}

/**
 * REDCap API client interface.
 *
 * Provides methods for interacting with a REDCap project through its API.
 * All methods return Effect types for functional error handling and composition.
 *
 * @example
 * ```typescript
 * import { Effect, pipe } from 'effect';
 * import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';
 *
 * const client = createRedcapClient({
 *   url: RedcapUrl('https://redcap.example.com/api/'),
 *   token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
 * });
 *
 * // Fetch project info and records in parallel
 * const program = Effect.all({
 *   info: client.getProjectInfo(),
 *   records: client.exportRecords<{ record_id: string }>(),
 * });
 *
 * const { info, records } = await Effect.runPromise(program);
 * ```
 *
 * @see {@link createRedcapClient} - Factory function to create a client
 * @see {@link makeRedcapClientLayer} - Create an Effect Layer for dependency injection
 */
export interface RedcapClient {
  /**
   * Gets the REDCap version number.
   *
   * @returns Effect resolving to the version string (e.g., '13.7.0')
   *
   * @example
   * ```typescript
   * const version = await Effect.runPromise(client.getVersion());
   * console.log(`REDCap version: ${version}`);
   * ```
   */
  readonly getVersion: () => Effect.Effect<string, RedcapHttpError | RedcapNetworkError>;

  /**
   * Gets project information and settings.
   *
   * @returns Effect resolving to project metadata
   *
   * @example
   * ```typescript
   * const info = await Effect.runPromise(client.getProjectInfo());
   * if (info.in_production === 1) {
   *   console.log('Project is in production mode');
   * }
   * ```
   */
  readonly getProjectInfo: () => Effect.Effect<
    RedcapProjectInfo,
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  /**
   * Gets all instruments (forms) in the project.
   *
   * @returns Effect resolving to array of instrument metadata
   *
   * @example
   * ```typescript
   * const instruments = await Effect.runPromise(client.getInstruments());
   * const formNames = instruments.map(i => i.instrument_name);
   * ```
   */
  readonly getInstruments: () => Effect.Effect<
    readonly RedcapInstrument[],
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  /**
   * Gets all fields (data dictionary) from the project.
   *
   * @returns Effect resolving to array of field metadata
   *
   * @example
   * ```typescript
   * const fields = await Effect.runPromise(client.getFields());
   * const textFields = fields.filter(f => f.field_type === 'text');
   * ```
   */
  readonly getFields: () => Effect.Effect<
    readonly RedcapField[],
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  /**
   * Gets export field name mappings.
   *
   * Useful for understanding how checkbox fields expand to multiple columns.
   *
   * @returns Effect resolving to array of field name mappings
   *
   * @example
   * ```typescript
   * const mappings = await Effect.runPromise(client.getExportFieldNames());
   * // Find all export columns for a checkbox field
   * const checkboxCols = mappings.filter(m => m.original_field_name === 'symptoms');
   * ```
   */
  readonly getExportFieldNames: () => Effect.Effect<
    readonly RedcapExportFieldName[],
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  /**
   * Exports records from the project.
   *
   * @typeParam T - The expected shape of each record
   * @param options - Optional filtering and export options
   * @returns Effect resolving to array of records
   *
   * @example
   * ```typescript
   * interface Patient {
   *   record_id: string;
   *   first_name: string;
   *   last_name: string;
   *   age: number;
   * }
   *
   * const patients = await Effect.runPromise(
   *   client.exportRecords<Patient>({
   *     fields: ['record_id', 'first_name', 'last_name', 'age'],
   *     filterLogic: '[age] >= 18',
   *   })
   * );
   * ```
   */
  readonly exportRecords: <T>(
    options?: ExportRecordsOptions
  ) => Effect.Effect<readonly T[], RedcapHttpError | RedcapApiError | RedcapNetworkError>;

  /**
   * Imports records into the project.
   *
   * @param records - Array of record objects to import
   * @param options - Optional import behavior settings
   * @returns Effect resolving to import result with count
   *
   * @example
   * ```typescript
   * const newRecords = [
   *   { record_id: '1', first_name: 'John', last_name: 'Doe' },
   *   { record_id: '2', first_name: 'Jane', last_name: 'Smith' },
   * ];
   *
   * const result = await Effect.runPromise(
   *   client.importRecords(newRecords, { overwriteBehavior: 'normal' })
   * );
   * console.log(`Imported ${result.count} records`);
   * ```
   */
  readonly importRecords: (
    records: readonly Record<string, unknown>[],
    options?: ImportRecordsOptions
  ) => Effect.Effect<
    { readonly count: number },
    RedcapHttpError | RedcapApiError | RedcapNetworkError
  >;

  /**
   * Gets a survey link for a specific record and instrument.
   *
   * @param record - The record ID (branded RecordId)
   * @param instrument - The instrument name (branded InstrumentName)
   * @returns Effect resolving to the survey URL
   *
   * @example
   * ```typescript
   * const surveyUrl = await Effect.runPromise(
   *   client.getSurveyLink(
   *     RecordId('abc12345678901234567'),
   *     InstrumentName('satisfaction_survey')
   *   )
   * );
   * // Send surveyUrl to participant
   * ```
   */
  readonly getSurveyLink: (
    record: RecordId,
    instrument: InstrumentName
  ) => Effect.Effect<string, RedcapHttpError | RedcapNetworkError>;

  /**
   * Downloads a PDF of a completed instrument for a record.
   *
   * @param recordId - The record ID (branded RecordId)
   * @param instrument - The instrument name (branded InstrumentName)
   * @returns Effect resolving to PDF binary data as ArrayBuffer
   *
   * @example
   * ```typescript
   * const pdfBuffer = await Effect.runPromise(
   *   client.downloadPdf(
   *     RecordId('abc12345678901234567'),
   *     InstrumentName('consent_form')
   *   )
   * );
   * // Save or send the PDF
   * fs.writeFileSync('consent.pdf', Buffer.from(pdfBuffer));
   * ```
   */
  readonly downloadPdf: (
    recordId: RecordId,
    instrument: InstrumentName
  ) => Effect.Effect<ArrayBuffer, RedcapHttpError | RedcapNetworkError>;

  /**
   * Finds a user's record ID by their email address.
   *
   * Searches for a record where the 'email' field matches the provided address.
   * Email values are automatically escaped to prevent filter logic injection.
   *
   * @param email - The email address to search for
   * @returns Effect resolving to the userid if found, or null if not found
   *
   * @example
   * ```typescript
   * const userId = await Effect.runPromise(
   *   client.findUserIdByEmail('john.doe@example.com')
   * );
   * if (userId) {
   *   console.log(`Found user: ${userId}`);
   * } else {
   *   console.log('User not found');
   * }
   * ```
   */
  readonly findUserIdByEmail: (
    email: string
  ) => Effect.Effect<string | null, RedcapHttpError | RedcapApiError | RedcapNetworkError>;
}
