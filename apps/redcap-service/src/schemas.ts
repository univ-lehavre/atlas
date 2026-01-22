import { Schema as S } from 'effect';

/**
 * Standard error response schema used across all API endpoints
 */
export const ErrorResponseSchema = S.Struct({
  data: S.Null,
  error: S.Struct({
    code: S.String,
    message: S.String,
  }),
}).annotations({ identifier: 'ErrorResponse', description: 'Error API response' });

/**
 * Generic success response OpenAPI schema
 * Used for endpoints where response data structure varies
 */
export const SuccessResponseOpenAPI = {
  type: 'object' as const,
  required: ['data'] as string[],
  properties: {
    data: { description: 'Response data - structure varies by endpoint' },
  },
  additionalProperties: false,
};

/**
 * REDCap validation patterns
 */

/**
 * Pattern for REDCap field/form names: ASCII alphanumeric, underscores, commas for lists
 */
export const REDCAP_NAME_PATTERN = /^[\w,]*$/;

/**
 * Pattern for REDCap instrument names: lowercase letter followed by lowercase letters, digits, underscores
 */
export const INSTRUMENT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Pattern for REDCap record IDs: alphanumeric, minimum 20 characters
 */
export const RECORD_ID_PATTERN = /^[a-z0-9]{20,}$/i;

/**
 * Pattern for email validation
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
