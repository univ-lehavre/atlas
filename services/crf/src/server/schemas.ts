import { Schema as S } from 'effect';

// Error response schema
export const ErrorResponseSchema = S.Struct({
  data: S.Null,
  error: S.Struct({
    code: S.String,
    message: S.String,
  }),
}).annotations({ identifier: 'ErrorResponse', description: 'Error API response' });

// Success response - openapi version (for describeRoute)
export const SuccessResponseOpenAPI = {
  type: 'object' as const,
  required: ['data'] as string[],
  properties: {
    data: { description: 'Response data - structure varies by endpoint' },
  },
  additionalProperties: false,
};

// Validation patterns/schemas. The instrument-name and email rules are
// re-exported from the Schema-as-brand source in crf-core (single source of
// truth, écart E12, ADR 0047) rather than re-declared here.
export {
  INSTRUMENT_NAME_PATTERN,
  EMAIL_PATTERN,
  InstrumentNameSchema,
  EmailSchema,
} from '@univ-lehavre/atlas-crf-core/brands';

// Comma-separated list of field/form names (e.g. `fields=a,b,c`), later split on
// `,`. Service-specific (validates a list, not a single name) — stays local.
export const CRF_NAME_LIST_PATTERN = /^[\w,]*$/;
