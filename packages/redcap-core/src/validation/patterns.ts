/**
 * Validation regex patterns
 *
 * Common patterns for validating REDCap values.
 */

/** REDCap API token pattern (32 uppercase hex chars) */
export const TOKEN_PATTERN = /^[A-F0-9]{32}$/;

/** REDCap field/form name pattern */
export const REDCAP_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Record ID pattern (alphanumeric) */
export const RECORD_ID_PATTERN = /^[\w-]+$/;

/** Email pattern */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

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
