/**
 * REDCap record ID branded type.
 *
 * Record IDs in REDCap are typically alphanumeric strings (the exact pattern
 * depends on auto-numbering configuration). Schema-as-brand: a single Schema
 * is the source of the type, pattern, predicate, parser and constructor
 * (écart E12, ADR 0047).
 */

import type { Either, ParseResult } from 'effect';
import { makeStringBrand } from './make-string-brand.js';

const brand = makeStringBrand('RecordId', /^[\w-]+$/, 'alphanumeric, at least 1 character');

/** REDCap record identifier. */
export type RecordId = typeof brand.schema.Type;

/** Record ID validation pattern (alphanumeric, at least 1 character). */
export const RECORD_ID_PATTERN = brand.pattern;

/** The `Schema` source of truth for {@link RecordId}. */
export const RecordIdSchema = brand.schema;

/** Validate and brand a string as {@link RecordId} (throws `ParseError` on invalid). */
export const RecordId = (value: string): RecordId => brand.make(value);

/** Check if a string is a valid record ID. */
export const isValidRecordId = (value: string): value is RecordId => brand.is(value);

/** Parse a string as {@link RecordId}, returning `Either`. */
export const parseRecordId = (value: string): Either.Either<RecordId, ParseResult.ParseError> =>
  brand.parse(value);
