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

// Validation patterns
// Comma-separated list of field/form names (e.g. `fields=a,b,c`), later split on
// `,`. Distinct from crf-core's CRF_NAME_PATTERN, which validates a single name.
export const CRF_NAME_LIST_PATTERN = /^[\w,]*$/;
export const INSTRUMENT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

// InstrumentName schema
export const InstrumentNameSchema = S.String.pipe(S.pattern(INSTRUMENT_NAME_PATTERN));

// Email schema
export const EmailSchema = S.String.pipe(S.pattern(EMAIL_PATTERN));
