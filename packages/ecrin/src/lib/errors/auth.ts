import { ApplicationError } from '$lib/errors';

export class MagicUrlLoginValidationError extends ApplicationError {
  constructor(
    message = 'Invalid magic link parameters',
    opts?: { cause?: string; details?: unknown }
  ) {
    super('validation_error', 400, message, opts);
  }
}

export class UserIdValidationError extends ApplicationError {
  constructor(message = 'Invalid user id', opts?: { cause?: string; details?: unknown }) {
    super('validation_error', 400, message, opts);
  }
}
