/**
 * REDCap instrument (form) name branded type
 *
 * Instrument names follow REDCap naming conventions:
 * lowercase letters, digits, and underscores, starting with a letter.
 */

import type { Either } from 'effect';
import { Brand } from 'effect';

/** REDCap instrument (form) name */
export type InstrumentName = string & Brand.Brand<'InstrumentName'>;

/** Instrument name validation pattern */
export const INSTRUMENT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Validate and brand a string as InstrumentName */
export const InstrumentName = Brand.refined<InstrumentName>(
  (value) => INSTRUMENT_NAME_PATTERN.test(value),
  (value) => Brand.error(`Invalid instrument name format: ${value}`)
);

/** Check if a string is a valid instrument name */
export const isValidInstrumentName = (value: string): value is InstrumentName =>
  INSTRUMENT_NAME_PATTERN.test(value);

/** Parse a string as InstrumentName, returning Either */
export const parseInstrumentName = (
  value: string
): Either.Either<InstrumentName, Brand.Brand.BrandErrors> => InstrumentName.either(value);

/** REDCap field name (same rules as instrument) */
export type FieldName = string & Brand.Brand<'FieldName'>;

/** Field name validation pattern */
export const FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Validate and brand a string as FieldName */
export const FieldName = Brand.refined<FieldName>(
  (value) => FIELD_NAME_PATTERN.test(value),
  (value) => Brand.error(`Invalid field name format: ${value}`)
);

/** Check if a string is a valid field name */
export const isValidFieldName = (value: string): value is FieldName =>
  FIELD_NAME_PATTERN.test(value);

/** Parse a string as FieldName, returning Either */
export const parseFieldName = (value: string): Either.Either<FieldName, Brand.Brand.BrandErrors> =>
  FieldName.either(value);
