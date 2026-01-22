/**
 * @module errors
 * @description Error types for REDCap API client using Effect's tagged error pattern.
 *
 * This module provides three distinct error types to handle different failure scenarios
 * when communicating with the REDCap API:
 *
 * - {@link RedcapHttpError} - HTTP-level errors (4xx, 5xx responses)
 * - {@link RedcapApiError} - Application-level errors (200 response with error payload)
 * - {@link RedcapNetworkError} - Network/transport errors (connection failures, timeouts)
 *
 * All errors extend Effect's TaggedError for seamless integration with Effect's
 * error handling and pattern matching capabilities.
 *
 * @example
 * ```typescript
 * import { Effect, Match } from 'effect';
 * import { RedcapHttpError, RedcapApiError, RedcapNetworkError } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Pattern matching on error types
 * const handleError = Match.type<RedcapError>().pipe(
 *   Match.tag('RedcapHttpError', (e) => `HTTP ${e.status}: ${e.message}`),
 *   Match.tag('RedcapApiError', (e) => `API Error: ${e.message}`),
 *   Match.tag('RedcapNetworkError', (e) => `Network Error: ${e.cause}`),
 *   Match.exhaustive
 * );
 * ```
 */
import { Data } from 'effect';

/**
 * HTTP-level error from REDCap API.
 *
 * Represents errors where the HTTP response status code indicates a failure
 * (non-2xx status). This includes authentication failures (401, 403),
 * not found errors (404), rate limiting (429), and server errors (5xx).
 *
 * @example
 * ```typescript
 * import { Effect } from 'effect';
 * import { RedcapHttpError } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Creating an HTTP error
 * const error = new RedcapHttpError({ status: 401, message: 'Invalid token' });
 *
 * // Handling HTTP errors
 * Effect.catchTag('RedcapHttpError', (e) => {
 *   if (e.status === 401) {
 *     return Effect.fail('Authentication failed');
 *   }
 *   return Effect.fail(`HTTP error ${e.status}`);
 * });
 * ```
 *
 * @property {number} status - The HTTP status code (e.g., 401, 403, 404, 500)
 * @property {string} message - The error message from the response body
 */
export class RedcapHttpError extends Data.TaggedError('RedcapHttpError')<{
  /** The HTTP status code of the failed response */
  readonly status: number;
  /** The error message extracted from the response body */
  readonly message: string;
}> {}

/**
 * Application-level error from REDCap API.
 *
 * Represents errors where REDCap returns a 200 OK HTTP response but includes
 * an error object in the JSON body. This is REDCap's way of indicating
 * application-level errors such as invalid parameters, permission issues,
 * or data validation failures.
 *
 * REDCap returns these as: `{ "error": "Error message here" }`
 *
 * @example
 * ```typescript
 * import { Effect } from 'effect';
 * import { RedcapApiError } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Creating an API error
 * const error = new RedcapApiError({ message: 'Invalid token' });
 *
 * // Handling API errors
 * Effect.catchTag('RedcapApiError', (e) => {
 *   console.error('REDCap API error:', e.message);
 *   return Effect.fail('Operation failed');
 * });
 * ```
 *
 * @property {string} message - The error message from REDCap's error response
 */
export class RedcapApiError extends Data.TaggedError('RedcapApiError')<{
  /** The error message from REDCap's error response payload */
  readonly message: string;
}> {}

/**
 * Network-level error during REDCap API communication.
 *
 * Represents errors that occur at the network/transport layer before
 * receiving an HTTP response. This includes:
 * - DNS resolution failures
 * - Connection timeouts
 * - Network unreachable errors
 * - TLS/SSL handshake failures
 * - Fetch API errors
 *
 * @example
 * ```typescript
 * import { Effect } from 'effect';
 * import { RedcapNetworkError } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Creating a network error
 * const error = new RedcapNetworkError({ cause: new Error('Connection timeout') });
 *
 * // Handling network errors with retry
 * Effect.retry(
 *   myOperation,
 *   Schedule.exponential('1 second').pipe(
 *     Schedule.filter(() => true) // Only retry network errors
 *   )
 * );
 * ```
 *
 * @property {unknown} cause - The underlying error that caused the network failure
 */
export class RedcapNetworkError extends Data.TaggedError('RedcapNetworkError')<{
  /** The underlying error that caused the network failure (typically Error or TypeError) */
  readonly cause: unknown;
}> {}

/**
 * Union type representing all possible REDCap API errors.
 *
 * Use this type when you need to handle any error that can occur during
 * REDCap API operations. All client methods return Effects that can fail
 * with one or more of these error types.
 *
 * @example
 * ```typescript
 * import { Effect, Match } from 'effect';
 * import type { RedcapError } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Type-safe error handling
 * const handleError = (error: RedcapError): string => {
 *   switch (error._tag) {
 *     case 'RedcapHttpError':
 *       return `HTTP ${error.status}: ${error.message}`;
 *     case 'RedcapApiError':
 *       return `API Error: ${error.message}`;
 *     case 'RedcapNetworkError':
 *       return `Network Error: ${String(error.cause)}`;
 *   }
 * };
 *
 * // Using with Effect.catchAll
 * Effect.catchAll(myOperation, (error: RedcapError) =>
 *   Effect.succeed(handleError(error))
 * );
 * ```
 */
export type RedcapError = RedcapHttpError | RedcapApiError | RedcapNetworkError;
