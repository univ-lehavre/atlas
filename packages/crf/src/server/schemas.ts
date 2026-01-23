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
export const REDCAP_NAME_PATTERN = /^[\w,]*$/;
export const INSTRUMENT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
export const RECORD_ID_PATTERN = /^[a-z0-9]{20,}$/i;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

// RecordId schema
export const RecordIdSchema = S.String.pipe(S.minLength(20), S.pattern(RECORD_ID_PATTERN));

// InstrumentName schema
export const InstrumentNameSchema = S.String.pipe(S.pattern(INSTRUMENT_NAME_PATTERN));

// Email schema
export const EmailSchema = S.String.pipe(S.pattern(EMAIL_PATTERN));
