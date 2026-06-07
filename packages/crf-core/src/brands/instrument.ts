/**
 * REDCap instrument (form) and field name branded types.
 *
 * Both follow REDCap naming conventions: lowercase letters, digits and
 * underscores, starting with a letter. Schema-as-brand (écart E12, ADR 0047).
 */

import type { Either, ParseResult } from 'effect';
import { makeStringBrand } from './make-string-brand.js';

const NAME_RULE = 'lowercase letters, digits and underscores, starting with a letter';
// Instrument and field names share the exact same rule — one literal.
const NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

const instrument = makeStringBrand('InstrumentName', NAME_PATTERN, NAME_RULE);

/** REDCap instrument (form) name. */
export type InstrumentName = typeof instrument.schema.Type;

/** Instrument name validation pattern. */
export const INSTRUMENT_NAME_PATTERN = instrument.pattern;

/** The `Schema` source of truth for {@link InstrumentName}. */
export const InstrumentNameSchema = instrument.schema;

/** Validate and brand a string as {@link InstrumentName} (throws on invalid). */
export const InstrumentName = (value: string): InstrumentName => instrument.make(value);

/** Check if a string is a valid instrument name. */
export const isValidInstrumentName = (value: string): value is InstrumentName =>
  instrument.is(value);

/** Parse a string as {@link InstrumentName}, returning `Either`. */
export const parseInstrumentName = (
  value: string
): Either.Either<InstrumentName, ParseResult.ParseError> => instrument.parse(value);

const field = makeStringBrand('FieldName', NAME_PATTERN, NAME_RULE);

/** REDCap field name (same rules as instrument). */
export type FieldName = typeof field.schema.Type;

/** Field name validation pattern. */
export const FIELD_NAME_PATTERN = field.pattern;

/** The `Schema` source of truth for {@link FieldName}. */
export const FieldNameSchema = field.schema;

/** Validate and brand a string as {@link FieldName} (throws on invalid). */
export const FieldName = (value: string): FieldName => field.make(value);

/** Check if a string is a valid field name. */
export const isValidFieldName = (value: string): value is FieldName => field.is(value);

/** Parse a string as {@link FieldName}, returning `Either`. */
export const parseFieldName = (value: string): Either.Either<FieldName, ParseResult.ParseError> =>
  field.parse(value);
