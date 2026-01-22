import type { Context } from 'hono';

/**
 * Validation error hook that returns errors in the correct API format
 *
 * This hook is used with hono-openapi's validator middleware to transform
 * validation errors into our standardized error response format.
 *
 * @param result - Validation result from the validator
 * @param c - Hono context
 * @returns Response with error details or undefined if validation succeeded
 *
 * @example
 * ```typescript
 * import { validator } from 'hono-openapi';
 * import { validationErrorHook } from '../middleware/validation.js';
 *
 * app.get('/users',
 *   validator('query', S.standardSchemaV1(QuerySchema), validationErrorHook),
 *   (c) => { ... }
 * );
 * ```
 */
export const validationErrorHook = (
  result: { success: boolean; error?: readonly { message: string }[] },
  c: Context
): Response | undefined =>
  result.success
    ? undefined
    : c.json(
        {
          data: null,
          error: {
            code: 'validation_error',
            message: result.error?.map((i) => i.message).join(', ') ?? 'Validation failed',
          },
        },
        400
      );
