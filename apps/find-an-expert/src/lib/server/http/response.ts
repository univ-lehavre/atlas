import { json } from '@sveltejs/kit';
import { ApplicationError } from '@univ-lehavre/atlas-errors';

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
  const { body, status } = flatErrorMapper(error);
  return json(body, { status });
};

/**
 * Strategy passed to `withHandler({ mapError })` to keep find-an-expert's
 * flat `{ code, message, cause? }` response shape (no `{ data, error }`
 * wrapper, contrary to amarre/ecrin). Same logic as
 * {@link mapErrorToResponse} but returns the body+status pair instead
 * of a `Response`.
 */
export const flatErrorMapper = (error: unknown): { body: ApiError; status: number } => {
  if (error instanceof ApplicationError) {
    const body: ApiError = { code: error.code, message: error.message };
    if (error.cause) body.cause = error.cause;
    return { body, status: error.httpStatus };
  }
  console.error('Unexpected error:', error);
  return {
    body: { code: 'unexpected_error', message: 'Unknown error' },
    status: 500,
  };
};
