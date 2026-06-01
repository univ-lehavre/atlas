/**
 * Helpers for working with declarative CRF project templates:
 * validation, a sensible default template, and (de)serialization.
 *
 * All fallible helpers return Effect's {@link Either} rather than throwing,
 * keeping the package side-effect free and composable.
 */

import { Either, Schema } from 'effect';
import type { ParseResult } from 'effect';
import { ProjectTemplate } from './schema.js';
import type { ProjectTemplate as ProjectTemplateType, ProjectTemplateEncoded } from './schema.js';

const decodeUnknown = Schema.decodeUnknownEither(ProjectTemplate);
const encode = Schema.encodeEither(ProjectTemplate);

/**
 * Validate an arbitrary value against the project-template schema.
 *
 * @returns `Right<ProjectTemplate>` on success, `Left<ParseError>` otherwise.
 */
export const validateTemplate = (
  value: unknown
): Either.Either<ProjectTemplateType, ParseResult.ParseError> => decodeUnknown(value);

/**
 * Type guard: is `value` a structurally valid project template?
 */
export const isValidTemplate = (value: unknown): value is ProjectTemplateType =>
  Either.isRight(decodeUnknown(value));

/**
 * Encode a template back into its plain, JSON-ready representation.
 */
export const encodeTemplate = (
  template: ProjectTemplateType
): Either.Either<ProjectTemplateEncoded, ParseResult.ParseError> => encode(template);

/**
 * Serialize a template to a (optionally pretty-printed) JSON string.
 *
 * @returns `Right<string>` on success, `Left<ParseError>` if the template
 *   does not satisfy the schema.
 */
export const serializeTemplate = (
  template: ProjectTemplateType,
  options?: { readonly pretty?: boolean }
): Either.Either<string, ParseResult.ParseError> =>
  Either.map(encode(template), (encoded) =>
    JSON.stringify(encoded, undefined, options?.pretty === true ? 2 : undefined)
  );

/**
 * Parse and validate a JSON string into a project template.
 *
 * @returns `Right<ProjectTemplate>` on success. On failure, `Left` carries
 *   either the JSON syntax error or the schema {@link ParseResult.ParseError}.
 */
export const deserializeTemplate = (
  json: string
): Either.Either<ProjectTemplateType, ParseResult.ParseError | Error> =>
  Either.flatMap(parseJson(json), (parsed) => decodeUnknown(parsed));

const parseJson = (json: string): Either.Either<unknown, Error> =>
  Either.try({
    try: () => JSON.parse(json) as unknown,
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });

/**
 * A minimal, valid starting template — useful for scaffolding a new CRF
 * project. Contains a single `enrollment` instrument with a record id, a
 * subject name and an enrollment date.
 */
export const defaultTemplate = (): ProjectTemplateType => ({
  metadata: {
    name: 'Untitled CRF project',
    version: '1.0.0',
  },
  instruments: [
    {
      name: 'enrollment',
      label: 'Enrollment',
      fields: [
        { name: 'record_id', label: 'Record ID', type: 'text', required: true },
        { name: 'subject_name', label: 'Subject name', type: 'text', required: true },
        { name: 'enrollment_date', label: 'Enrollment date', type: 'date', required: true },
      ],
    },
  ],
});
