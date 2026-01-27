import { json } from '@sveltejs/kit';
import { ApplicationError } from '.';

export const mapErrorToResponse = (error: unknown): Response => {
  if (error instanceof ApplicationError) {
    return json(
      { data: null, error: { code: error.code, message: error.message, cause: error.cause } },
      { status: error.httpStatus }
    );
  }

  if (error instanceof Error) {
    return json(
      { data: null, error: { code: 'internal_error', message: error.message } },
      { status: 500 }
    );
  }

  return json(
    { data: null, error: { code: 'internal_error', message: 'Unknown error' } },
    { status: 500 }
  );
};
