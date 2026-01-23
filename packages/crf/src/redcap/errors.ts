/**
 * @module errors
 * @description Error types for REDCap API client using Effect's tagged error pattern.
 */
import { Data } from 'effect';

/**
 * HTTP-level error from REDCap API.
 *
 * Represents errors where the HTTP response status code indicates a failure
 * (non-2xx status). This includes authentication failures (401, 403),
 * not found errors (404), rate limiting (429), and server errors (5xx).
 */
export class RedcapHttpError extends Data.TaggedError('RedcapHttpError')<{
  readonly status: number;
  readonly message: string;
}> {}

/**
 * Application-level error from REDCap API.
 *
 * Represents errors where REDCap returns a 200 OK HTTP response but includes
 * an error object in the JSON body: `{ "error": "Error message here" }`
 *
 * The optional `status` field allows overriding the HTTP status code
 * when surfacing this error through the CRF API (defaults to 400).
 */
export class RedcapApiError extends Data.TaggedError('RedcapApiError')<{
  readonly message: string;
  readonly status?: number;
}> {}

/**
 * Network-level error during REDCap API communication.
 *
 * Represents errors that occur at the network/transport layer before
 * receiving an HTTP response (DNS failures, timeouts, TLS errors, etc.).
 */
export class RedcapNetworkError extends Data.TaggedError('RedcapNetworkError')<{
  readonly cause: unknown;
}> {}

/**
 * Union type representing all possible REDCap API errors.
 */
export type RedcapError = RedcapHttpError | RedcapApiError | RedcapNetworkError;
