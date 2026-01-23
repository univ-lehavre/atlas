import type { Context } from 'hono';

/**
 * Validation error hook that returns errors in the correct API format
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
