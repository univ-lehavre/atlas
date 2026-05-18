import { Effect, Match, pipe } from 'effect';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { type CrfClientError } from '@univ-lehavre/atlas-crf-client';

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
  error: CrfClientError
): { readonly body: ErrorResponse; readonly status: ContentfulStatusCode } =>
  pipe(
    Match.value(error),
    Match.tag('CrfHttpError', (e) => ({
      body: {
        data: null,
        error: { code: 'crf_http_error', message: e.message },
      },
      status: toContentfulStatus(e.status),
    })),
    Match.tag('CrfApiError', (e) => ({
      body: {
        data: null,
        error: { code: e.code ?? 'crf_api_error', message: e.message },
      },
      status: toContentfulStatus(400),
    })),
    Match.tag('CrfNetworkError', () => ({
      body: {
        data: null,
        error: { code: 'network_error', message: 'Failed to connect to REDCap' },
      },
      status: toContentfulStatus(503),
    })),
    Match.tag('VersionParseError', (e) => ({
      body: {
        data: null,
        error: { code: 'version_parse_error', message: e.message },
      },
      status: toContentfulStatus(502),
    })),
    Match.tag('UnsupportedVersionError', (e) => ({
      body: {
        data: null,
        error: { code: 'unsupported_version', message: e.message },
      },
      status: toContentfulStatus(501),
    })),
    Match.exhaustive
  );

/**
 * Runs an Effect and returns a Hono Response
 */
export const runEffect = <A>(
  c: Context,
  effect: Effect.Effect<A, CrfClientError>
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
  effect: Effect.Effect<A, CrfClientError>
): Promise<Response> =>
  pipe(
    effect,
    Effect.catchAll((error) => {
      const { body, status } = mapErrorToResponse(error);
      return Effect.succeed(c.json(body, status));
    }),
    Effect.runPromise
  );
