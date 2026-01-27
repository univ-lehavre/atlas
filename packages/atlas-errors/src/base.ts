/**
 * Options for error construction.
 */
export interface ErrorOptions {
  /** Human-readable cause of the error */
  cause?: string;
  /** Additional details for debugging */
  details?: unknown;
}

/**
 * Base error class for application-specific errors.
 * Provides structured error information for HTTP APIs.
 *
 * @example
 * ```typescript
 * throw new ApplicationError('custom_error', 400, 'Something went wrong', {
 *   cause: 'Invalid input provided'
 * });
 * ```
 */
export class ApplicationError extends Error {
  /** Machine-readable error code */
  readonly code: string;
  /** HTTP status code */
  readonly httpStatus: number;
  /** Human-readable cause of the error */
  override readonly cause: string | undefined;
  /** Additional details for debugging */
  readonly details?: unknown;

  constructor(code: string, httpStatus: number, message: string, opts?: ErrorOptions) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.cause = opts?.cause;
    this.details = opts?.details;
    this.name = this.constructor.name;
  }
}
