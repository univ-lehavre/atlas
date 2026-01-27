// Re-export base types and classes
export { ApplicationError, type ErrorOptions } from './base.js';

import { ApplicationError, type ErrorOptions } from './base.js';

/**
 * Error thrown when session is missing or invalid.
 *
 * @example
 * ```typescript
 * throw new SessionError('No active session', { cause: 'Cookie expired' });
 * ```
 */
export class SessionError extends ApplicationError {
  constructor(message = 'Session error', opts?: ErrorOptions) {
    super('session_error', 401, message, opts);
  }
}

/**
 * Error thrown when request body contains invalid JSON.
 *
 * @example
 * ```typescript
 * throw new InvalidJsonBodyError('Request body must be valid JSON');
 * ```
 */
export class InvalidJsonBodyError extends ApplicationError {
  constructor(message = 'Invalid JSON body', opts?: ErrorOptions) {
    super('invalid_json', 400, message, opts);
  }
}

/**
 * Error thrown when Content-Type header is not application/json.
 *
 * @example
 * ```typescript
 * if (!contentType.includes('application/json')) {
 *   throw new InvalidContentTypeError();
 * }
 * ```
 */
export class InvalidContentTypeError extends ApplicationError {
  constructor(message = 'Content-Type must be application/json', opts?: ErrorOptions) {
    super('invalid_content_type', 400, message, opts);
  }
}

/**
 * Error thrown when provided email is invalid or not allowed.
 *
 * @example
 * ```typescript
 * if (!isValidEmail(email)) {
 *   throw new NotAnEmailError('Registration not possible', {
 *     cause: 'Invalid email format'
 *   });
 * }
 * ```
 */
export class NotAnEmailError extends ApplicationError {
  constructor(message = 'Registration not possible', opts?: ErrorOptions) {
    super('invalid_email', 400, message, opts);
  }
}

/**
 * Error thrown when email domain is not part of allowed alliance.
 * Specific to applications with domain-based registration restrictions.
 *
 * @example
 * ```typescript
 * if (!isAllowedDomain(email)) {
 *   throw new NotPartOfAllianceError('Registration not possible', {
 *     cause: 'Email domain not in allowed list'
 *   });
 * }
 * ```
 */
export class NotPartOfAllianceError extends ApplicationError {
  constructor(message = 'Registration not possible', opts?: ErrorOptions) {
    super('not_in_alliance', 400, message, opts);
  }
}

/**
 * Standard API error response structure.
 */
export interface ApiErrorResponse {
  data: null;
  error: {
    code: string;
    message: string;
    cause?: string;
  };
}

/**
 * Maps an error to an API error response object.
 * Use with a JSON response helper (e.g., SvelteKit's json()).
 *
 * @param error - The error to map
 * @returns Object containing the response body and HTTP status
 *
 * @example
 * ```typescript
 * import { json } from '@sveltejs/kit';
 *
 * try {
 *   // ... operation
 * } catch (error) {
 *   const { body, status } = mapErrorToApiResponse(error);
 *   return json(body, { status });
 * }
 * ```
 */
export const mapErrorToApiResponse = (
  error: unknown
): { body: ApiErrorResponse; status: number } => {
  if (error instanceof ApplicationError) {
    return {
      body: {
        data: null,
        error: { code: error.code, message: error.message, cause: error.cause },
      },
      status: error.httpStatus,
    };
  }

  if (error instanceof Error) {
    return {
      body: {
        data: null,
        error: { code: 'internal_error', message: error.message },
      },
      status: 500,
    };
  }

  return {
    body: {
      data: null,
      error: { code: 'internal_error', message: 'Unknown error' },
    },
    status: 500,
  };
};

// Re-export auth errors from the auth submodule for convenience
export {
  MagicUrlLoginValidationError,
  UserIdValidationError,
  RequestBodyValidationError,
} from './auth.js';
