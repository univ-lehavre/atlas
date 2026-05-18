/**
 * REDCap record ID branded type
 *
 * Record IDs in REDCap are typically alphanumeric strings.
 * The pattern depends on auto-numbering configuration.
 */

import type { Either } from 'effect';
import { Brand } from 'effect';

/** REDCap record identifier */
export type RecordId = string & Brand.Brand<'RecordId'>;

/** Record ID validation pattern (alphanumeric, at least 1 character) */
export const RECORD_ID_PATTERN = /^[\w-]+$/;

/** Validate and brand a string as RecordId */
export const RecordId = Brand.refined<RecordId>(
  (value) => value.length > 0 && RECORD_ID_PATTERN.test(value),
  (value) => Brand.error(`Invalid record ID format: ${value}`)
);

/** Check if a string is a valid record ID */
export const isValidRecordId = (value: string): value is RecordId =>
  value.length > 0 && RECORD_ID_PATTERN.test(value);

/** Parse a string as RecordId, returning Either */
export const parseRecordId = (value: string): Either.Either<RecordId, Brand.Brand.BrandErrors> =>
  RecordId.either(value);
