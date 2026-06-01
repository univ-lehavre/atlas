/**
 * Declarative CRF project-template schema.
 *
 * Describes the *shape* of a CRF project — its instruments (forms), the
 * fields each instrument carries, and project-level metadata — as a single
 * Effect {@link Schema} value. Because the description is a Schema, it is both
 * a static TypeScript type and a runtime validator/(de)serializer.
 *
 * Identifier rules (instrument names, field names) are aligned with
 * `@univ-lehavre/atlas-crf-core`: lowercase letters, digits and underscores,
 * starting with a letter.
 */

import { Schema } from 'effect';
import { INSTRUMENT_NAME_PATTERN, FIELD_NAME_PATTERN } from '@univ-lehavre/atlas-crf-core/brands';

/** Supported field value types for a CRF template field. */
export const FieldType = Schema.Literal('text', 'number', 'date', 'datetime', 'choice', 'boolean');
/** Discriminated set of field value types. */
export type FieldType = typeof FieldType.Type;

/** Instrument (form) name — lowercase, digits, underscores, starts with a letter. */
export const InstrumentNameSchema = Schema.String.pipe(
  Schema.pattern(INSTRUMENT_NAME_PATTERN, {
    identifier: 'InstrumentName',
    description: 'lowercase letters, digits and underscores, starting with a letter',
  })
);
/** Validated instrument name string. */
export type InstrumentNameSchema = typeof InstrumentNameSchema.Type;

/** Field name — same rules as an instrument name. */
export const FieldNameSchema = Schema.String.pipe(
  Schema.pattern(FIELD_NAME_PATTERN, {
    identifier: 'FieldName',
    description: 'lowercase letters, digits and underscores, starting with a letter',
  })
);
/** Validated field name string. */
export type FieldNameSchema = typeof FieldNameSchema.Type;

/** A single allowed option for a `choice` field. */
export const ChoiceOption = Schema.Struct({
  /** Stored, machine-readable value. */
  value: Schema.NonEmptyString,
  /** Human-readable label shown in the UI. */
  label: Schema.NonEmptyString,
});
/** A single allowed option for a `choice` field. */
export type ChoiceOption = typeof ChoiceOption.Type;

/** A field within an instrument. */
export const TemplateField = Schema.Struct({
  /** Machine name of the field, unique within its instrument. */
  name: FieldNameSchema,
  /** Human-readable label. */
  label: Schema.NonEmptyString,
  /** Value type carried by the field. */
  type: FieldType,
  /** Whether a value is mandatory. Defaults to `false` when omitted. */
  required: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  /** Allowed options — only meaningful for `choice` fields. */
  options: Schema.optional(Schema.Array(ChoiceOption)),
});
/** A field within an instrument. */
export type TemplateField = typeof TemplateField.Type;
/** Encoded (wire) representation of a {@link TemplateField}. */
export type TemplateFieldEncoded = typeof TemplateField.Encoded;

/** An instrument (form) grouping a non-empty, ordered list of fields. */
export const TemplateInstrument = Schema.Struct({
  /** Machine name of the instrument, unique within the project. */
  name: InstrumentNameSchema,
  /** Human-readable label. */
  label: Schema.NonEmptyString,
  /** Ordered, non-empty list of fields. */
  fields: Schema.NonEmptyArray(TemplateField),
});
/** An instrument (form) grouping fields. */
export type TemplateInstrument = typeof TemplateInstrument.Type;

/** Project-level metadata. */
export const TemplateMetadata = Schema.Struct({
  /** Display name of the project. */
  name: Schema.NonEmptyString,
  /** Semantic-ish version string of the template (free-form). */
  version: Schema.NonEmptyString,
  /** Optional free-text description. */
  description: Schema.optional(Schema.String),
});
/** Project-level metadata. */
export type TemplateMetadata = typeof TemplateMetadata.Type;

/** A full declarative CRF project template. */
export const ProjectTemplate = Schema.Struct({
  metadata: TemplateMetadata,
  /** Ordered, non-empty list of instruments. */
  instruments: Schema.NonEmptyArray(TemplateInstrument),
});
/** A full declarative CRF project template. */
export type ProjectTemplate = typeof ProjectTemplate.Type;
/** Encoded (JSON-ready) representation of a {@link ProjectTemplate}. */
export type ProjectTemplateEncoded = typeof ProjectTemplate.Encoded;
