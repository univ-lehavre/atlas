/**
 * Base error class for application-specific errors.
 */
export class ApplicationError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly cause: string | undefined;
  readonly details?: unknown;

  constructor(
    code: string,
    httpStatus: number,
    message: string,
    opts?: { cause?: string; details?: unknown }
  ) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.cause = opts?.cause;
    this.details = opts?.details;
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when session is missing or invalid.
 */
export class SessionError extends ApplicationError {
  constructor(message = 'Session error', opts?: { cause?: string; details?: unknown }) {
    super('session_error', 401, message, opts);
  }
}

/**
 * Error thrown when request body contains invalid JSON.
 */
export class InvalidJsonBodyError extends ApplicationError {
  constructor(message = 'Invalid JSON body', opts?: { cause?: string; details?: unknown }) {
    super('invalid_json', 400, message, opts);
  }
}

/**
 * Error thrown when Content-Type header is not application/json.
 */
export class InvalidContentTypeError extends ApplicationError {
  constructor(
    message = 'Content-Type must be application/json',
    opts?: { cause?: string; details?: unknown }
  ) {
    super('invalid_content_type', 400, message, opts);
  }
}
