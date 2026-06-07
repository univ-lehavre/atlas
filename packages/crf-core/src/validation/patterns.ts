/**
 * Validation regex patterns.
 *
 * Common patterns for validating REDCap values. The patterns that back a
 * branded type (token, CRF name, record id, email) are **re-exported from the
 * Schema-as-brand source** (`../brands`) rather than re-declared — single
 * source of truth (écart E12, ADR 0047). The remaining patterns describe
 * value formats with no branded type and live here.
 */

// Re-exported from the brand Schemas (single source). CRF_NAME_PATTERN is the
// instrument/field-name rule.
export { CRF_TOKEN_PATTERN as TOKEN_PATTERN, RECORD_ID_PATTERN } from '../brands/index.js';
export { INSTRUMENT_NAME_PATTERN as CRF_NAME_PATTERN } from '../brands/index.js';
export { EMAIL_PATTERN } from '../brands/index.js';

/** Version pattern (X.Y.Z) */
export const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

/** ISO timestamp pattern (date or datetime) */
export const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/;

/** REDCap date format (YYYY-MM-DD) */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** REDCap datetime format (YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS) */
export const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

/** REDCap time format (HH:MM or HH:MM:SS) */
export const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

/** Integer pattern */
export const INTEGER_PATTERN = /^-?\d+$/;

/** Decimal number pattern */
export const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

/** URL pattern */
export const URL_PATTERN = /^https?:\/\/\S+$/;

/** Phone pattern (flexible) */
export const PHONE_PATTERN = /^[+\d][\d\s()-]{7,}$/;

/** Zip code pattern (US) */
export const ZIPCODE_PATTERN = /^\d{5}(-\d{4})?$/;
