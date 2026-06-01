/**
 * @module @univ-lehavre/atlas-crf-project-template
 * @description Declarative, typed CRF project template built with Effect Schema.
 *
 * A *project template* describes the shape of a CRF project — its instruments
 * (forms), the fields each instrument carries, and project-level metadata — as
 * a single {@link ProjectTemplate} Schema value. Because the description is a
 * Schema, it doubles as a static TypeScript type and a runtime
 * validator/(de)serializer, making it reusable to scaffold new CRF projects.
 *
 * @example
 * ```typescript
 * import {
 *   defaultTemplate,
 *   serializeTemplate,
 *   deserializeTemplate,
 * } from '@univ-lehavre/atlas-crf-project-template';
 * import { Either } from 'effect';
 *
 * const template = defaultTemplate();
 * const json = serializeTemplate(template, { pretty: true });
 * if (Either.isRight(json)) {
 *   const roundTripped = deserializeTemplate(json.right);
 *   // roundTripped: Either<ProjectTemplate, ...>
 * }
 * ```
 *
 * @packageDocumentation
 */

export {
  FieldType,
  ChoiceOption,
  TemplateField,
  TemplateInstrument,
  TemplateMetadata,
  ProjectTemplate,
  InstrumentNameSchema,
  FieldNameSchema,
} from './schema.js';

export type { TemplateFieldEncoded, ProjectTemplateEncoded } from './schema.js';

export {
  validateTemplate,
  isValidTemplate,
  encodeTemplate,
  serializeTemplate,
  deserializeTemplate,
  defaultTemplate,
} from './template.js';
