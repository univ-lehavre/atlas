/**
 * @module types
 * @description Type definitions and branded types for REDCap API client.
 *
 * This module contains all TypeScript interfaces, types, and branded types used by the REDCap API client.
 * It defines configuration structures, API response shapes, branded validation types, and the main client interface.
 *
 * @example
 * ```typescript
 * import {
 *   RedcapUrl,
 *   RedcapToken,
 *   RecordId,
 *   InstrumentName,
 * } from '@univ-lehavre/atlas-redcap-api';
 * import type {
 *   RedcapConfig,
 *   RedcapClient,
 *   RedcapProjectInfo,
 *   ExportRecordsOptions
 * } from '@univ-lehavre/atlas-redcap-api';
 *
 * const config: RedcapConfig = {
 *   url: RedcapUrl('https://redcap.example.com/api/'),
 *   token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
 * };
 * ```
 */
import type { Effect } from 'effect';
import { Brand } from 'effect';
import { SafeApiUrl } from '@univ-lehavre/atlas-net';
import type { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';

// ============================================================================
// Branded Types
// ============================================================================

/**
 * Branded type for REDCap API URL.
 *
 * Type alias for SafeApiUrl from @univ-lehavre/atlas-net.
 * Ensures URLs are valid and safe for REDCap API communication.
 *
 * The URL must meet the following requirements:
 * - Valid URL format parseable by the URL constructor
 * - HTTP or HTTPS protocol only
 * - No embedded credentials (username/password in URL)
 * - Non-empty hostname
 * - No query string parameters (REDCap uses POST body for params)
 * - No URL fragments
 *
 * @example
 * ```typescript
 * // Valid URLs
 * const url1 = RedcapUrl('https://redcap.example.com/api/');
 * const url2 = RedcapUrl('http://localhost:8080/redcap/api/');
 *
 * // Invalid URLs throw BrandError
 * RedcapUrl('ftp://example.com');           // wrong protocol
 * RedcapUrl('https://user:pass@example.com'); // credentials in URL
 * RedcapUrl('https://example.com?token=x'); // query string not allowed
 * RedcapUrl('not-a-url');                   // invalid URL format
 * ```
 *
 * @throws {Brand.BrandError} When the URL is invalid or fails security checks
 */
export type RedcapUrl = SafeApiUrl;

/**
 * Constructor function for RedcapUrl branded type.
 *
 * Validates and brands a string as a RedcapUrl. Throws if validation fails.
 *
 * @param url - The URL string to validate and brand
 * @returns The validated RedcapUrl
 * @throws {Brand.BrandError} When the URL is invalid
 */

export const RedcapUrl = SafeApiUrl;

/**
 * Branded type for REDCap API token.
 *
 * REDCap API tokens are 32-character hexadecimal strings (uppercase A-F, 0-9).
 * These tokens are used to authenticate API requests and should be treated
 * as sensitive credentials.
 *
 * @example
 * ```typescript
 * // Valid token (32 uppercase hex characters)
 * const token = RedcapToken('AABBCCDD11223344AABBCCDD11223344');
 *
 * // Invalid tokens throw BrandError
 * RedcapToken('abc');                               // too short
 * RedcapToken('e1b217963ccee21ef78322345b3b8782'); // lowercase not allowed
 * RedcapToken('G1B217963CCEE21EF78322345B3B8782'); // 'G' not valid hex
 * ```
 *
 * @throws {Brand.BrandError} When the token format is invalid
 */
export type RedcapToken = string & Brand.Brand<'RedcapToken'>;

/**
 * Constructor function for RedcapToken branded type.
 *
 * Validates that the token is exactly 32 uppercase hexadecimal characters.
 *
 * @param token - The token string to validate and brand
 * @returns The validated RedcapToken
 * @throws {Brand.BrandError} When the token format is invalid
 */
export const RedcapToken = Brand.refined<RedcapToken>(
  (token) => /^[A-F0-9]{32}$/.test(token),
  () => Brand.error('Invalid REDCap token: must be a 32-character uppercase hexadecimal string')
);

/**
 * Branded type for REDCap record IDs.
 *
 * Record IDs must be alphanumeric strings of at least 20 characters.
 * This format is compatible with Appwrite-style IDs commonly used
 * in the Atlas project.
 *
 * @example
 * ```typescript
 * // Valid record IDs (alphanumeric, 20+ characters)
 * const id1 = RecordId('abc12345678901234567');
 * const id2 = RecordId('ABC12345678901234567890');
 *
 * // Invalid record IDs throw BrandError
 * RecordId('short');                  // too short (less than 20 chars)
 * RecordId('abc-123-456-789-012'); // hyphens not allowed
 * RecordId('abc_123_456_789_012'); // underscores not allowed
 * ```
 *
 * @throws {Brand.BrandError} When the record ID format is invalid
 */
export type RecordId = string & Brand.Brand<'RecordId'>;

/**
 * Constructor function for RecordId branded type.
 *
 * Validates that the ID is alphanumeric and at least 20 characters long.
 *
 * @param id - The record ID string to validate and brand
 * @returns The validated RecordId
 * @throws {Brand.BrandError} When the record ID format is invalid
 */
export const RecordId = Brand.refined<RecordId>(
  (id) => /^[a-z0-9]{20,}$/i.test(id),
  (id) =>
    Brand.error(
      `Invalid Record ID: "${id}" must be an alphanumeric string of at least 20 characters`
    )
);

/**
 * Branded type for REDCap instrument names.
 *
 * Instrument names follow REDCap's naming convention:
 * - Must start with a lowercase letter
 * - Can contain lowercase letters, digits, and underscores
 * - Typically matches the `instrument_name` field from REDCap metadata
 *
 * @example
 * ```typescript
 * // Valid instrument names
 * const inst1 = InstrumentName('my_survey');
 * const inst2 = InstrumentName('demographics');
 * const inst3 = InstrumentName('visit_1_form');
 *
 * // Invalid instrument names throw BrandError
 * InstrumentName('My_Survey');    // uppercase not allowed
 * InstrumentName('1_survey');     // cannot start with digit
 * InstrumentName('my-survey');    // hyphens not allowed
 * InstrumentName('');             // empty string not allowed
 * ```
 *
 * @throws {Brand.BrandError} When the instrument name format is invalid
 */
export type InstrumentName = string & Brand.Brand<'InstrumentName'>;

/**
 * Constructor function for InstrumentName branded type.
 *
 * Validates that the name follows REDCap's instrument naming convention.
 *
 * @param name - The instrument name string to validate and brand
 * @returns The validated InstrumentName
 * @throws {Brand.BrandError} When the instrument name format is invalid
 */
export const InstrumentName = Brand.refined<InstrumentName>(
  (name) => /^[a-z][a-z0-9_]*$/.test(name),
  (name) => Brand.error(`Invalid instrument name: "${name}" must be lowercase with underscores`)
);

/**
 * Branded type for REDCap user IDs.
 *
 * User IDs in REDCap are alphanumeric strings that identify users in the system.
 * They must be at least 1 character and contain only alphanumeric characters and underscores.
 *
 * @example
 * ```typescript
 * // Valid user IDs
 * const id1 = UserId('user123');
 * const id2 = UserId('john_doe');
 *
 * // Invalid user IDs throw BrandError
 * UserId('');           // empty string not allowed
 * UserId('user@123');   // special characters not allowed
 * ```
 *
 * @throws {Brand.BrandError} When the user ID format is invalid
 */
export type UserId = string & Brand.Brand<'UserId'>;

/**
 * Constructor function for UserId branded type.
 *
 * Validates that the ID contains only alphanumeric characters and underscores.
 *
 * @param id - The user ID string to validate and brand
 * @returns The validated UserId
 * @throws {Brand.BrandError} When the user ID format is invalid
 */
export const UserId = Brand.refined<UserId>(
  (id) => /^\w+$/.test(id),
  (id) =>
    Brand.error(
      `Invalid User ID: "${id}" must contain only alphanumeric characters and underscores`
    )
);

/**
 * Branded type for email addresses.
 *
 * Validates email addresses using a standard regex pattern.
 * Used for user lookups and communication in REDCap.
 *
 * @example
 * ```typescript
 * // Valid emails
 * const email1 = Email('user@example.com');
 * const email2 = Email('john.doe+tag@university.edu');
 *
 * // Invalid emails throw BrandError
 * Email('invalid');           // no @ symbol
 * Email('@example.com');      // no local part
 * Email('user@');             // no domain
 * ```
 *
 * @throws {Brand.BrandError} When the email format is invalid
 */
export type Email = string & Brand.Brand<'Email'>;

/**
 * Constructor function for Email branded type.
 *
 * Validates that the string is a valid email address format.
 *
 * @param email - The email string to validate and brand
 * @returns The validated Email
 * @throws {Brand.BrandError} When the email format is invalid
 */
export const Email = Brand.refined<Email>(
  (email) => /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email),
  (email) => Brand.error(`Invalid email: "${email}" must be a valid email address`)
);

/**
 * Branded type for positive integers.
 *
 * Validates that a number is a positive integer (>= 1).
 * Used for IDs like project_id in REDCap.
 *
 * @example
 * ```typescript
 * // Valid positive integers
 * const id1 = PositiveInt(1);
 * const id2 = PositiveInt(12345);
 *
 * // Invalid values throw BrandError
 * PositiveInt(0);      // must be >= 1
 * PositiveInt(-1);     // negative not allowed
 * PositiveInt(1.5);    // must be integer
 * ```
 *
 * @throws {Brand.BrandError} When the value is not a positive integer
 */
export type PositiveInt = number & Brand.Brand<'PositiveInt'>;

/**
 * Constructor function for PositiveInt branded type.
 *
 * Validates that the number is a positive integer (>= 1).
 *
 * @param n - The number to validate and brand
 * @returns The validated PositiveInt
 * @throws {Brand.BrandError} When the value is not a positive integer
 */
export const PositiveInt = Brand.refined<PositiveInt>(
  (n) => Number.isInteger(n) && n >= 1,
  (n) => Brand.error(`Invalid positive integer: ${String(n)} must be an integer >= 1`)
);

/**
 * Branded type for non-empty strings.
 *
 * Validates that a string is not empty (length >= 1).
 * Used for required text fields like project_title.
 *
 * @example
 * ```typescript
 * // Valid non-empty strings
 * const title = NonEmptyString('My Project');
 * const name = NonEmptyString('a');
 *
 * // Invalid values throw BrandError
 * NonEmptyString('');   // empty string not allowed
 * ```
 *
 * @throws {Brand.BrandError} When the string is empty
 */
export type NonEmptyString = string & Brand.Brand<'NonEmptyString'>;

/**
 * Constructor function for NonEmptyString branded type.
 *
 * Validates that the string is not empty.
 *
 * @param s - The string to validate and brand
 * @returns The validated NonEmptyString
 * @throws {Brand.BrandError} When the string is empty
 */
export const NonEmptyString = Brand.refined<NonEmptyString>(
  (s) => s.length > 0,
  () => Brand.error('Invalid string: must not be empty')
);

/**
 * Branded type for ISO 8601 timestamps.
 *
 * Validates that a string is a valid ISO 8601 date/datetime format.
 * REDCap uses format like "2024-01-15 10:30:00" or ISO format.
 *
 * @example
 * ```typescript
 * // Valid timestamps
 * const ts1 = IsoTimestamp('2024-01-15 10:30:00');
 * const ts2 = IsoTimestamp('2024-01-15T10:30:00Z');
 * const ts3 = IsoTimestamp('2024-01-15');
 *
 * // Invalid values throw BrandError
 * IsoTimestamp('invalid');       // not a valid date
 * IsoTimestamp('15/01/2024');    // wrong format
 * ```
 *
 * @throws {Brand.BrandError} When the string is not a valid timestamp
 */
export type IsoTimestamp = string & Brand.Brand<'IsoTimestamp'>;

/**
 * Constructor function for IsoTimestamp branded type.
 *
 * Validates that the string is a valid ISO 8601 timestamp.
 *
 * @param ts - The timestamp string to validate and brand
 * @returns The validated IsoTimestamp
 * @throws {Brand.BrandError} When the string is not a valid timestamp
 */
/**
 * Validates an ISO timestamp string.
 * @internal
 */
const isValidIsoTimestamp = (ts: string): boolean => {
  // REDCap uses "YYYY-MM-DD HH:mm:ss" or ISO format
  // eslint-disable-next-line security/detect-unsafe-regex -- Pattern is bounded and safe
  const isoPattern = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)?$/;
  const isValidFormat = isoPattern.test(ts);
  const date = new Date(ts.replace(' ', 'T'));
  return isValidFormat && !Number.isNaN(date.getTime());
};

export const IsoTimestamp = Brand.refined<IsoTimestamp>(isValidIsoTimestamp, (ts) =>
  Brand.error(`Invalid timestamp: "${ts}" must be a valid ISO 8601 date/datetime`)
);

/**
 * Branded type for boolean flags (0 or 1).
 *
 * REDCap uses 0 and 1 to represent boolean values in many API responses.
 * This type ensures the value is exactly 0 or 1.
 *
 * @example
 * ```typescript
 * // Valid boolean flags
 * const enabled = BooleanFlag(1);
 * const disabled = BooleanFlag(0);
 *
 * // Invalid values throw BrandError
 * BooleanFlag(2);    // must be 0 or 1
 * BooleanFlag(-1);   // must be 0 or 1
 * ```
 *
 * @throws {Brand.BrandError} When the value is not 0 or 1
 */
export type BooleanFlag = (0 | 1) & Brand.Brand<'BooleanFlag'>;

/**
 * Constructor function for BooleanFlag branded type.
 *
 * Validates that the value is exactly 0 or 1.
 *
 * @param n - The number to validate and brand
 * @returns The validated BooleanFlag
 * @throws {Brand.BrandError} When the value is not 0 or 1
 */
/**
 * Validates a boolean flag value (0 or 1).
 * @internal
 */
const isValidBooleanFlag = (n: number): boolean => n === 0 || n === 1;

export const BooleanFlag = Brand.refined<BooleanFlag>(isValidBooleanFlag, (n) =>
  Brand.error(`Invalid boolean flag: ${String(n)} must be 0 or 1`)
);

// ============================================================================
// Configuration Types
// ============================================================================

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
  readonly project_id: PositiveInt;
  /** Human-readable title of the project */
  readonly project_title: NonEmptyString;
  /** ISO 8601 timestamp when the project was created */
  readonly creation_time: IsoTimestamp;
  /** Whether the project is in production mode (1) or development mode (0) */
  readonly in_production: BooleanFlag;
  /** Whether automatic record numbering is enabled (1) or disabled (0) */
  readonly record_autonumbering_enabled: BooleanFlag;
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
  readonly instrument_name: InstrumentName;
  /** Human-readable display label (e.g., 'Demographics Form') */
  readonly instrument_label: NonEmptyString;
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
  readonly field_name: NonEmptyString;
  /** Name of the instrument/form containing this field */
  readonly form_name: InstrumentName;
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
