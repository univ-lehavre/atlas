import { Effect, Match, pipe } from 'effect';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { type RedcapError } from '@univ-lehavre/atlas-redcap-api';

/**
 * Response shape for API errors
 */
interface ErrorResponse {
  readonly data: null;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Converts an HTTP status code to a valid ContentfulStatusCode
 * @param status - The HTTP status code
 * @returns A valid ContentfulStatusCode
 */
const toContentfulStatus = (status: number): ContentfulStatusCode =>
  (status >= 400 && status < 600 ? status : 502) as ContentfulStatusCode;

/**
 * Maps REDCap errors to HTTP responses
 * @param error - The REDCap error to map
 * @returns An object containing the error response body and HTTP status code
 */
const mapErrorToResponse = (
  error: RedcapError
): { readonly body: ErrorResponse; readonly status: ContentfulStatusCode } =>
  pipe(
    Match.value(error),
    Match.tag('RedcapHttpError', (e) => ({
      body: {
        data: null,
        error: { code: 'redcap_http_error', message: e.message },
      },
      status: toContentfulStatus(e.status),
    })),
    Match.tag('RedcapApiError', (e) => ({
      body: {
        data: null,
        error: { code: 'redcap_api_error', message: e.message },
      },
      status: 400 as ContentfulStatusCode,
    })),
    Match.tag('RedcapNetworkError', () => ({
      body: {
        data: null,
        error: { code: 'network_error', message: 'Failed to connect to REDCap' },
      },
      status: 503 as ContentfulStatusCode,
    })),
    Match.exhaustive
  );

/**
 * Runs an Effect and returns a Hono Response
 * Handles REDCap errors and converts them to appropriate HTTP responses
 * @param c - The Hono context
 * @param effect - The Effect to run
 * @returns A Promise resolving to a Hono Response
 */
export const runEffect = <A>(
  c: Context,
  effect: Effect.Effect<A, RedcapError>
): Promise<Response> =>
  pipe(
    effect,
    Effect.map((data) => c.json({ data })),
    Effect.catchAll((error) => {
      const { body, status } = mapErrorToResponse(error);
      return Effect.succeed(c.json(body, status));
    }),
    Effect.runPromise
  );

/**
 * Runs an Effect that returns a raw Response (e.g., for binary data)
 * @param c - The Hono context
 * @param effect - The Effect to run
 * @returns A Promise resolving to a Hono Response
 */
export const runEffectRaw = <A extends Response>(
  c: Context,
  effect: Effect.Effect<A, RedcapError>
): Promise<Response> =>
  pipe(
    effect,
    Effect.catchAll((error) => {
      const { body, status } = mapErrorToResponse(error);
      return Effect.succeed(c.json(body, status));
    }),
    Effect.runPromise
  );
