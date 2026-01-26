/**
 * Validation functions
 */

import {
  TOKEN_PATTERN,
  REDCAP_NAME_PATTERN,
  RECORD_ID_PATTERN,
  EMAIL_PATTERN,
  VERSION_PATTERN,
  DATE_PATTERN,
  DATETIME_PATTERN,
  TIME_PATTERN,
  INTEGER_PATTERN,
  NUMBER_PATTERN,
  URL_PATTERN,
} from './patterns.js';

/** Validate a REDCap API token */
export const isValidToken = (value: string): boolean => TOKEN_PATTERN.test(value);

/** Validate a REDCap field/form name */
export const isValidRedcapName = (value: string): boolean => REDCAP_NAME_PATTERN.test(value);

/** Validate a record ID */
export const isValidRecordId = (value: string): boolean =>
  value.length > 0 && RECORD_ID_PATTERN.test(value);

/** Validate an email address */
export const isValidEmail = (value: string): boolean => EMAIL_PATTERN.test(value);

/** Validate a version string */
export const isValidVersion = (value: string): boolean => VERSION_PATTERN.test(value);

/** Validate a REDCap date (YYYY-MM-DD) */
export const isValidDate = (value: string): boolean => DATE_PATTERN.test(value);

/** Validate a REDCap datetime */
export const isValidDatetime = (value: string): boolean => DATETIME_PATTERN.test(value);

/** Validate a REDCap time */
export const isValidTime = (value: string): boolean => TIME_PATTERN.test(value);

/** Validate an integer string */
export const isValidInteger = (value: string): boolean => INTEGER_PATTERN.test(value);

/** Validate a number string */
export const isValidNumber = (value: string): boolean => NUMBER_PATTERN.test(value);

/** Validate a URL */
export const isValidUrl = (value: string): boolean => URL_PATTERN.test(value);

/** Validate value is within range */
export const isInRange = (value: number, min?: number, max?: number): boolean => {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
};

/** Validate string length */
export const isValidLength = (value: string, min?: number, max?: number): boolean => {
  if (min !== undefined && value.length < min) return false;
  if (max !== undefined && value.length > max) return false;
  return true;
};
