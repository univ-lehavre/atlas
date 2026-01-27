import { json } from '@sveltejs/kit';
import { ApplicationError } from '.';

export const mapErrorToResponse = (error: unknown): Response => {
  if (error instanceof ApplicationError)
    return json(
      { data: null, error: { code: error.code, message: error.message, cause: error.cause } },
      { status: error.httpStatus }
    );
  console.error('Unexpected error:', error);
  return json(
    { data: null, error: { code: 'unexpected_error', message: 'Unknown error' } },
    { status: 500 }
  );
};
