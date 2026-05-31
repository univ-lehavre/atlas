/**
 * Shared wrapper for SvelteKit `+server.ts` request handlers.
 *
 * Every `+server.ts` in the monorepo is shaped the same way :
 *
 * 1. run an async piece of business logic that may throw,
 * 2. on success, return a `Response` (often `json(payload)`),
 * 3. on failure, map the error to a uniform JSON response
 *    (`{ data: null, error: { code, message } }` for amarre/ecrin,
 *    `{ code, message }` for find-an-expert).
 *
 * `withHandler` factors the try/catch + the error mapping. It does
 * **not** impose a response envelope on the success path — the inner
 * function may either return a `Response` directly (e.g. PDF binary
 * stream, custom headers, …) or any value, in which case the wrapper
 * serialises it with `Response.json`. This keeps the helper compatible
 * with the three response shapes currently in use.
 *
 * The package only depends on the Web `Response` type for runtime, and
 * imports `@sveltejs/kit` for **types only** — `workspace-structure`
 * forbids `packages/` from runtime-importing `@sveltejs/kit`.
 *
 * @module
 */

import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { mapErrorToApiResponse } from '@univ-lehavre/atlas-errors';

/**
 * Strategy to convert an unknown error into a JSON-serialisable body
 * and an HTTP status. Default : {@link mapErrorToApiResponse} from
 * `@univ-lehavre/atlas-errors` (the `{ data: null, error }` envelope).
 *
 * find-an-expert exposes a flatter shape (`{ code, message }`) — pass a
 * custom mapper to opt into it.
 */
export type ErrorMapper = (error: unknown) => {
  readonly body: unknown;
  readonly status: number;
};

/**
 * Optional knobs passed to {@link withHandler}.
 */
export interface WithHandlerOptions {
  /**
   * Override the default error mapper.
   * Default : {@link mapErrorToApiResponse} (atlas-errors envelope).
   */
  readonly mapError?: ErrorMapper;
  /**
   * Extra response headers attached to **both** the success and error
   * branches. Useful for `X-RateLimit-*` and similar cross-cutting
   * headers that have to ride along no matter what.
   */
  readonly headers?: HeadersInit;
  /**
   * HTTP status for the success branch when the inner function returns
   * a non-`Response` value. Defaults to `200`.
   *
   * Ignored when the inner function returns a `Response` directly.
   */
  readonly successStatus?: number;
}

const defaultMapError: ErrorMapper = (error) => mapErrorToApiResponse(error);

/**
 * Materialise a header source as a flat `[name, value]` array.
 *
 * `Headers` is iterable as `[name, value]` pairs, but the lib `dom`
 * type exposes the iterator as `IterableIterator<[any, any]>` ; we
 * cast back to the runtime shape (strings) to keep the merge
 * type-safe.
 */
const toEntries = (init: HeadersInit): readonly [string, string][] =>
  [...new Headers(init)] as readonly [string, string][];

/**
 * Merge two header sources. `Headers` accepts an `[name, value][]`
 * constructor argument and, on duplicate keys, the **last** entry
 * wins — so `b` overrides `a` on conflict.
 */
const mergeHeaders = (a: HeadersInit, b: HeadersInit): Headers =>
  new Headers([...toEntries(a), ...toEntries(b)]);

const toResponse = (
  result: unknown,
  successStatus: number,
  extraHeaders: HeadersInit | undefined
): Response => {
  if (result instanceof Response) {
    if (extraHeaders === undefined) return result;
    // Re-emit the existing Response, merging extra headers in.
    const merged = mergeHeaders(result.headers, extraHeaders);
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: merged,
    });
  }
  return Response.json(result, {
    status: successStatus,
    ...(extraHeaders === undefined ? {} : { headers: extraHeaders }),
  });
};

/**
 * Wraps an async function into a SvelteKit `RequestHandler` with a
 * shared try/catch + error-mapping boilerplate.
 *
 * The inner function receives the full `RequestEvent` and may return :
 *
 * - a `Response` directly (e.g. binary stream, custom Content-Type,
 *   non-200 success status) — it is forwarded as-is (with any
 *   {@link WithHandlerOptions.headers | extra headers} merged in),
 * - any other value — serialised with `Response.json(value, { status })`
 *   using {@link WithHandlerOptions.successStatus | successStatus}
 *   (default `200`).
 *
 * On thrown errors, the configured {@link WithHandlerOptions.mapError
 * | mapError} (default = atlas-errors `mapErrorToApiResponse`) produces
 * the response body and status.
 */
export const withHandler = <
  Params extends Record<string, string> = Record<string, string>,
  RouteId extends string | null = string | null,
>(
  fn: (event: RequestEvent<Params, RouteId>) => Promise<unknown>,
  options?: WithHandlerOptions
): RequestHandler<Params, RouteId> => {
  const mapError = options?.mapError ?? defaultMapError;
  const successStatus = options?.successStatus ?? 200;

  return async (event) => {
    try {
      const result = await fn(event);
      return toResponse(result, successStatus, options?.headers);
    } catch (error: unknown) {
      const { body, status } = mapError(error);
      return Response.json(body, {
        status,
        ...(options?.headers === undefined ? {} : { headers: options.headers }),
      });
    }
  };
};
