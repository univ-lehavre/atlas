import type { RequestEvent } from "@sveltejs/kit";

/**
 * Build a minimal SvelteKit `RequestEvent`-like object suitable for unit-testing
 * `+server.ts` endpoint handlers without spinning up a real server.
 *
 * The returned object only fills the fields a handler typically reads
 * (`request`, `locals`, `getClientAddress`, `url`, `params`). Other fields
 * (`platform`, `setHeaders`, `cookies`, `route`, `fetch`, `isDataRequest`,
 * `isSubRequest`) are filled with no-op stubs to satisfy the `RequestEvent`
 * type while keeping the helper agnostic of what each handler does.
 *
 * @example
 * ```ts
 * const event = createRouteEvent({
 *   method: 'POST',
 *   url: 'https://example.com/api/v1/auth/signup',
 *   body: { email: 'a@b.fr' },
 *   ip: '203.0.113.42',
 * });
 * const res = await POST(event);
 * ```
 */
export interface CreateRouteEventOptions<TLocals = Record<string, unknown>> {
  /** HTTP method. Defaults to `'GET'`. */
  readonly method?: string;
  /** Full URL of the request. Defaults to `'https://example.com/'`. */
  readonly url?: string;
  /** JSON body (will be serialised). Pass `undefined` for no body. */
  readonly body?: unknown;
  /** Extra request headers. `content-type` is set automatically when `body` is given. */
  readonly headers?: Record<string, string>;
  /** Value returned by `event.getClientAddress()`. Defaults to `'127.0.0.1'`. */
  readonly ip?: string;
  /** Populated `event.locals`. Defaults to `{}`. */
  readonly locals?: TLocals;
  /** Route params (typed from `[id]`-style segments). Defaults to `{}`. */
  readonly params?: Record<string, string>;
}

const noopCookies = {
  get: () => {
    /* noop */
  },
  getAll: () => [],
  set: () => {
    /* noop */
  },
  delete: () => {
    /* noop */
  },
  serialize: () => "",
};

/**
 * Create a SvelteKit `RequestEvent`-like object. See module-level JSDoc for
 * usage examples.
 *
 * Cast as `RequestEvent` so callers can pass the result directly to typed
 * handlers (`POST: RequestHandler` of a specific route) without `as never`
 * juggling per call site. The fields actually populated are: `request`,
 * `url`, `params`, `locals`, `getClientAddress`. All others are no-op
 * stubs satisfying the type only.
 */

export const createRouteEvent = <TLocals = Record<string, unknown>>(
  options: CreateRouteEventOptions<TLocals> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- helper générique : voir commentaire au retour
): RequestEvent<any, any> => {
  const {
    method = "GET",
    url = "https://example.com/",
    body,
    headers = {},
    ip = "127.0.0.1",
    locals = {} as TLocals,
    params = {},
  } = options;

  const finalHeaders: Record<string, string> = { ...headers };
  let serialised: string | undefined;
  if (body !== undefined) {
    serialised = typeof body === "string" ? body : JSON.stringify(body);
    finalHeaders["content-type"] ??= "application/json";
  }

  const request = new Request(url, {
    method,
    headers: finalHeaders,
    ...(serialised === undefined ? {} : { body: serialised }),
  });

  const event = {
    request,
    url: new URL(url),
    params,
    locals,
    getClientAddress: () => ip,
    setHeaders: () => {
      /* noop */
    },
    fetch: globalThis.fetch,
    isDataRequest: false,
    isSubRequest: false,
    cookies: noopCookies,
    platform: undefined,
    route: { id: null },
  };
  // SvelteKit `RequestHandler` types are parameterised per-route
  // (`RequestEvent<{id: string}, '/api/v1/foo/[id]'>` etc.). A test
  // helper can't reasonably enumerate every concrete shape, so we cast
  // through `any` to let any handler accept the event. The runtime
  // shape is still validated by the test itself.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- helper générique compatible n'importe quelle signature de RequestHandler
  return event as unknown as RequestEvent<any, any>;
};
