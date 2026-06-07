/**
 * Effect ↔ SvelteKit boundary adapter.
 *
 * Symmetric counterpart of `services/crf`'s `runEffect` (Hono), for the
 * SvelteKit side. It runs an `Effect<A, E>` produced by `lib/server/*`
 * and turns it into a `Response`, translating **typed** failures into the
 * correct HTTP status **before** `Effect.runPromise` — so a `TaggedError`
 * never reaches the promise rejection path and is never flattened to an
 * opaque `FiberFailure → 500`.
 *
 * Why a separate module (not `with-handler.ts`) : `@univ-lehavre/atlas-errors`
 * and `withHandler` carry **zero** `effect` dependency, and consumers that
 * only do vanilla try/catch must keep it that way (bundle cost,
 * [ADR 0005](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0005-effect-pour-la-pf.md)).
 * This adapter pulls `effect`, so it lives behind the `./effect` subpath
 * export : importing it is opt-in, and it is **server-only** — never import
 * it from a `.svelte` component or a shared client/server module, or
 * `effect` leaks into the client bundle
 * ([ADR 0046](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0046-frontiere-effect-sveltekit.md)).
 *
 * The adapter holds the **translation mechanism** ; the **concrete table**
 * `tag → status` is supplied by the consumer (its own `Match.tag` mapper),
 * exactly as `runEffect` does for the CRF service
 * ([ADR 0048](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0048-modele-erreur-http.md)).
 *
 * @module
 */

import { Effect, pipe } from 'effect';
import { ApplicationError } from '@univ-lehavre/atlas-errors';

/**
 * Translation of a typed error into a JSON-serialisable body and an HTTP
 * status. Typically built with `Match.value(error).pipe(Match.tag(...))`
 * — symmetric to the CRF service's `mapErrorToResponse`.
 */
export type EffectErrorMapper<E> = (error: E) => {
  readonly body: unknown;
  readonly status: number;
};

/**
 * Minimal structural shape of a runtime able to run the composed Effect — the
 * `runPromise` of a `ManagedRuntime` (cf. `@univ-lehavre/atlas-effect-socle`).
 * Declared structurally so this package keeps zero runtime dependency.
 */
export interface EffectRunner {
  readonly runPromise: <A>(effect: Effect.Effect<A>) => Promise<A>;
}

/**
 * Options for {@link runEffectHandler}.
 */
export interface RunEffectOptions<E> {
  /**
   * Central process runtime to execute on (its `runPromise`). When provided,
   * the handler runs on it so the app's `AppLayer` (logger, future tracer) is
   * in scope ([ADR 0045](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0045-runtime-central-effect.md)).
   * When omitted, the global `Effect.runPromise` is used (backward compatible).
   */
  readonly runtime?: EffectRunner;
  /**
   * Maps a typed failure `E` to `{ body, status }`. Required unless `E`
   * is `never` (an Effect that cannot fail in a typed way).
   *
   * The default — used only when no mapper is given — recognises
   * {@link ApplicationError} from `@univ-lehavre/atlas-errors` (honouring
   * its `httpStatus`/`code`) and falls back to `500 internal_error` for
   * anything else. Provide a mapper to translate your domain
   * `Data.TaggedError`s to their proper status.
   */
  readonly mapError?: EffectErrorMapper<E>;
  /**
   * HTTP status for the success branch when the Effect yields a
   * non-`Response` value, serialised with `Response.json`. Defaults to
   * `200`. Ignored when the Effect yields a `Response` directly.
   */
  readonly successStatus?: number;
  /**
   * Extra response headers attached to **both** success and error
   * branches (e.g. `X-RateLimit-*`).
   */
  readonly headers?: HeadersInit;
}

const defaultMapError: EffectErrorMapper<unknown> = (error) => {
  if (error instanceof ApplicationError) {
    return {
      body: { data: null, error: { code: error.code, message: error.message } },
      status: error.httpStatus,
    };
  }
  const message = error instanceof Error ? error.message : 'Internal error';
  return {
    body: { data: null, error: { code: 'internal_error', message } },
    status: 500,
  };
};

/**
 * Materialise a header source as a flat `[name, value]` array. `Headers`
 * is iterable as pairs, but the lib `dom` type exposes the iterator as
 * `IterableIterator<[any, any]>`; cast back to the runtime shape (strings)
 * to keep the merge type-safe.
 */
const toEntries = (init: HeadersInit): readonly [string, string][] =>
  [...new Headers(init)] as readonly [string, string][];

const withHeaders = (response: Response, extra: HeadersInit | undefined): Response => {
  if (extra === undefined) return response;
  // `Headers` lets the last entry win on duplicate keys, so `extra` overrides.
  const headers = new Headers([...toEntries(response.headers), ...toEntries(extra)]);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const successResponse = (
  value: unknown,
  successStatus: number,
  headers: HeadersInit | undefined
): Response =>
  value instanceof Response
    ? withHeaders(value, headers)
    : Response.json(value, {
        status: successStatus,
        ...(headers === undefined ? {} : { headers }),
      });

/**
 * Runs a server-side `Effect<A, E>` and resolves to a `Response`.
 *
 * Typed failures are caught with `Effect.catchAll` and mapped to their
 * HTTP status **before** `Effect.runPromise`, so the returned promise
 * always **resolves** (never rejects) — the typed error channel is
 * preserved end to end instead of collapsing to a `FiberFailure → 500`.
 *
 * Intended to be called from a SvelteKit server handler (`+server.ts`,
 * `+page.server.ts`, `actions`), with `lib/server/*` returning the raw
 * `Effect`.
 *
 * @example
 * ```ts
 * // +server.ts
 * import { runEffectHandler } from '@univ-lehavre/atlas-sveltekit-handler/effect';
 * import { Match } from 'effect';
 * import { searchInstitutions } from '$lib/server/citation';
 *
 * export const GET = ({ url }) =>
 *   runEffectHandler(searchInstitutions(url.searchParams.get('q') ?? ''), {
 *     mapError: (e) =>
 *       Match.value(e).pipe(
 *         Match.tag('StatusError', (se) => ({
 *           body: { code: 'upstream_error', message: se.message },
 *           status: 502,
 *         })),
 *         Match.orElse(() => ({
 *           body: { code: 'internal_error', message: 'Unknown error' },
 *           status: 500,
 *         }))
 *       ),
 *   });
 * ```
 */
export const runEffectHandler = <A, E = never>(
  effect: Effect.Effect<A, E>,
  options?: RunEffectOptions<E>
): Promise<Response> => {
  const mapError: EffectErrorMapper<E> = options?.mapError ?? defaultMapError;
  const successStatus = options?.successStatus ?? 200;

  const composed = pipe(
    effect,
    Effect.map((value) => successResponse(value, successStatus, options?.headers)),
    Effect.catchAll((error: E) => {
      const { body, status } = mapError(error);
      return Effect.succeed(
        Response.json(body, {
          status,
          ...(options?.headers === undefined ? {} : { headers: options.headers }),
        })
      );
    })
  );

  return options?.runtime === undefined
    ? Effect.runPromise(composed)
    : options.runtime.runPromise(composed);
};
