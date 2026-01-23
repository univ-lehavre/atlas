import { Effect, Match, pipe } from 'effect';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { type RedcapError } from '../redcap/index.js';

interface ErrorResponse {
  readonly data: null;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

const toContentfulStatus = (status: number): ContentfulStatusCode =>
  (status >= 400 && status < 600 ? status : 502) as ContentfulStatusCode;

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
      status: toContentfulStatus(e.status ?? 400),
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
