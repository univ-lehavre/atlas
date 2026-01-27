import { json } from '@sveltejs/kit';
import { ApplicationError } from './errors';

/**
 * Error response format for REST API.
 */
export interface ApiError {
  code: string;
  message: string;
  cause?: string;
}

/**
 * Maps an error to a REST JSON response.
 * @param error - The error to map
 * @returns A SvelteKit Response with appropriate status code and error object
 */
export const mapErrorToResponse = (error: unknown): Response => {
  if (error instanceof ApplicationError) {
    const body: ApiError = { code: error.code, message: error.message };
    if (error.cause) body.cause = error.cause;
    return json(body, { status: error.httpStatus });
  }
  console.error('Unexpected error:', error);
  return json({ code: 'unexpected_error', message: 'Unknown error' } satisfies ApiError, {
    status: 500,
  });
};
