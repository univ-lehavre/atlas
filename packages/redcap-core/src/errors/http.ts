/**
 * @module errors/http
 * @description REDCap HTTP errors for transport-level failures.
 *
 * HTTP errors occur when the REDCap server returns a non-2xx status code.
 * These are different from API errors (which return 200 with error body).
 *
 * @example
 * ```typescript
 * import { RedcapHttpError, fromResponse } from '@univ-lehavre/atlas-redcap-core/errors';
 * import { Effect } from 'effect';
 *
 * // Create error manually
 * const error = new RedcapHttpError({
 *   status: 401,
 *   statusText: 'Unauthorized',
 *   url: 'https://redcap.example.com/api/'
 * });
 *
 * // Check error type
 * if (error.isAuthError) {
 *   console.log('Authentication failed');
 * }
 *
 * // Create from fetch Response
 * const response = await fetch(url);
 * if (!response.ok) {
 *   const error = await fromResponse(response, url);
 *   return Effect.fail(error);
 * }
 * ```
 */

import { Data } from 'effect';

/**
 * HTTP error response from REDCap.
 *
 * Represents transport-level HTTP errors (4xx, 5xx status codes).
 * Extends Effect's TaggedError for seamless integration with Effect pipelines.
 *
 * @property status - HTTP status code (e.g., 401, 404, 500)
 * @property statusText - HTTP status text (e.g., "Unauthorized", "Not Found")
 * @property body - Optional response body content
 * @property url - Optional URL that was requested
 */
export class RedcapHttpError extends Data.TaggedError('RedcapHttpError')<{
  /** HTTP status code */
  readonly status: number;
  /** HTTP status text */
  readonly statusText: string;
  /** Response body content */
  readonly body?: string;
  /** URL that was requested */
  readonly url?: string;
}> {
  /**
   * Human-readable error message.
   *
   * @returns Formatted message like "HTTP 401 Unauthorized at https://..."
   */
  override get message(): string {
    return `HTTP ${this.status} ${this.statusText}${this.url ? ` at ${this.url}` : ''}`;
  }

  /**
   * Check if this is an authentication error (401 or 403).
   *
   * Authentication errors indicate invalid or missing API tokens,
   * or insufficient permissions for the requested operation.
   */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /**
   * Check if this is a rate limit error (429).
   *
   * Rate limit errors indicate too many requests in a short period.
   * These should be retried with exponential backoff.
   */
  get isRateLimitError(): boolean {
    return this.status === 429;
  }

  /**
   * Check if this is a server error (5xx).
   *
   * Server errors indicate problems on the REDCap server side.
   * These may be temporary and retryable.
   */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if this error is retryable.
   *
   * Retryable errors include rate limits and server errors.
   * Client errors (4xx except 429) are not retryable.
   */
  get isRetryable(): boolean {
    return this.isRateLimitError || this.isServerError;
  }
}

/**
 * Create an HTTP error from a fetch Response.
 *
 * Extracts status, statusText, and body from the Response object.
 * Safely handles body read failures.
 *
 * @param response - The fetch Response object
 * @param url - Optional URL for error context
 * @returns Promise resolving to RedcapHttpError
 *
 * @example
 * ```typescript
 * const response = await fetch(apiUrl, options);
 * if (!response.ok) {
 *   throw await fromResponse(response, apiUrl);
 * }
 * ```
 */
export const fromResponse = async (response: Response, url?: string): Promise<RedcapHttpError> => {
  const body = await response.text().catch(() => undefined);
  return new RedcapHttpError({
    status: response.status,
    statusText: response.statusText,
    body,
    url,
  });
};
