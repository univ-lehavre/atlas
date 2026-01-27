import { ApplicationError, type ErrorOptions } from './base.js';

/**
 * Error thrown when magic link URL parameters are invalid.
 *
 * @example
 * ```typescript
 * if (!userId || !secret) {
 *   throw new MagicUrlLoginValidationError('Login failed', {
 *     cause: 'Missing userId or secret'
 *   });
 * }
 * ```
 */
export class MagicUrlLoginValidationError extends ApplicationError {
  constructor(message = 'Invalid magic link parameters', opts?: ErrorOptions) {
    super('magicurl_login_validation_error', 400, message, opts);
  }
}

/**
 * Error thrown when user ID format is invalid.
 *
 * @example
 * ```typescript
 * if (!isHexadecimal(userId)) {
 *   throw new UserIdValidationError('Operation failed', {
 *     cause: 'Invalid userId format'
 *   });
 * }
 * ```
 */
export class UserIdValidationError extends ApplicationError {
  constructor(message = 'Invalid user id', opts?: ErrorOptions) {
    super('userid_validation_error', 400, message, opts);
  }
}

/**
 * Error thrown when request body validation fails.
 *
 * @example
 * ```typescript
 * if (!body.email) {
 *   throw new RequestBodyValidationError('Missing required fields', {
 *     cause: 'email is required'
 *   });
 * }
 * ```
 */
export class RequestBodyValidationError extends ApplicationError {
  constructor(message = 'Invalid request body', opts?: ErrorOptions) {
    super('request_body_validation_error', 400, message, opts);
  }
}
