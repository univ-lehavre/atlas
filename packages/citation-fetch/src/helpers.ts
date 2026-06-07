import { Effect, RateLimiter, Queue, Ref } from "effect";
import type { Schema } from "effect";
import type { FetchCitationAPIOptions } from "@univ-lehavre/atlas-citation-types";
import type {
  FetchError,
  ResponseParseError,
  RateLimitInfo,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  FetchOnePage,
  type Query,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  Store,
  type APIResponse,
  apiResponseSchema,
  initialState,
  type IState,
} from "./store.js";

export type { RateLimitInfo } from "@univ-lehavre/atlas-fetch-one-api-page";

interface FetchAPIMinimalConfigBase<T> {
  readonly userAgent: string;
  readonly rateLimit: RateLimiter.RateLimiter.Options;
  readonly apiURL: string;
  readonly endpoint: string;
  readonly fetchAPIOptions: FetchCitationAPIOptions;
  readonly perPage: number;
  readonly maxPages?: number;
  /**
   * Schema for a single result item; the page body is decoded against the
   * derived `APIResponse<T>` schema instead of an unchecked cast (écart E13).
   */
  readonly itemSchema: Schema.Schema<T>;
}

/** Called after each page with the latest rate limit info, if available. */
type OnRateLimit = (info: RateLimitInfo) => void;

/** Called after each page with the current page index and total pages (once known). */
type OnPage = (page: number, total: number | null) => void;

export type FetchAPIMinimalConfig<T> = FetchAPIMinimalConfigBase<T> & {
  readonly onRateLimit?: OnRateLimit;
  readonly onPage?: OnPage;
};

export const buildEndpointURL = (apiURL: string, endpoint: string): URL =>
  new URL(`${apiURL}/${endpoint}`);

export const buildInitialParams = <T>(
  opts: FetchAPIMinimalConfig<T>,
): Query => ({
  ...opts.fetchAPIOptions,
  per_page: opts.perPage,
});

type MakeRateLimiterFn = typeof RateLimiter.make;
type FetchOnePageFn<T> = (
  endpointURL: URL,
  params: Query,
  userAgent: string,
) => Effect.Effect<APIResponse<T>, FetchError | ResponseParseError>;

export const makeRateLimitedFetcher = <T>(
  url: URL,
  userAgent: string,
  rateLimit: RateLimiter.RateLimiter.Options,
  itemSchema: Schema.Schema<T>,
  onRateLimit?: (info: RateLimitInfo) => void,
  deps?: {
    makeRateLimiter?: MakeRateLimiterFn;
  },
) =>
  Effect.gen(function* () {
    const makeLimiter = deps?.makeRateLimiter ?? RateLimiter.make;
    // One-page fetching is an injected service (écart E14, ADR 0049): the real
    // network implementation is provided by FetchOnePageLive at the composition
    // root, a test layer in tests — no module-level import to vi.mock.
    const fetchOnePage = yield* FetchOnePage;
    // The response schema is derived from the caller's item schema; the page
    // body is decoded against it (écart E13) instead of an unchecked cast.
    const responseSchema = apiResponseSchema(itemSchema);
    const foa: FetchOnePageFn<T> = (
      u,
      p,
      ua,
    ): Effect.Effect<APIResponse<T>, FetchError | ResponseParseError> =>
      fetchOnePage(u, p, ua, responseSchema).pipe(
        Effect.map((result) =>
          result.rateLimit !== undefined && onRateLimit !== undefined
            ? (onRateLimit(result.rateLimit), result.data)
            : result.data,
        ),
      );

    const ratelimiter: RateLimiter.RateLimiter = yield* makeLimiter(rateLimit);
    return (
      q: Query,
    ): Effect.Effect<APIResponse<T>, FetchError | ResponseParseError> =>
      ratelimiter(foa(url, q, userAgent));
  });

export const ensureQueue = <T>(q?: Queue.Queue<T>) =>
  Effect.gen(function* () {
    return q ?? (yield* Queue.unbounded<T>());
  });

export const ensureStore = <T>(opts: { store?: Store<T>; maxPages?: number }) =>
  Effect.gen(function* () {
    // eslint-disable-next-line functional/no-conditional-statements -- early return pattern
    if (opts.store) return opts.store;
    const initState: IState = { ...initialState, maxPages: opts.maxPages };
    const ref = yield* Ref.make(initState);
    return new Store<T>(ref);
  });

export const makeWorker = <T>(
  store: Store<T>,
  queue: Queue.Queue<T>,
  fetchPage: (
    q: Query,
  ) => Effect.Effect<APIResponse<T>, FetchError | ResponseParseError>,
  params: Query,
  onPage?: (page: number, total: number | null) => void,
): Effect.Effect<void, FetchError | ResponseParseError> =>
  Effect.gen(function* () {
    // eslint-disable-next-line functional/no-loop-statements -- sequential pagination requires a loop
    while (yield* store.hasMorePages()) {
      params["page"] = yield* store.page;
      const response: APIResponse<T> = yield* fetchPage(params);
      yield* queue.offerAll(response.results);
      yield* store.addNewItems(response);
      yield* store.incPage();
      const st = yield* store.current;
      yield* Effect.sync(() =>
        onPage?.(st.page - 1, st.totalPages > 0 ? st.totalPages : null),
      );
    }
  });

/**
 * Fetches all pages and collects results into a plain array (no Queue scope issues).
 *
 * Malformed pages no longer break pagination silently: `fetchPage` decodes each
 * page against its Schema, so an unexpected shape fails loudly with a
 * `ResponseParseError` carrying the `ParseError` (écart E13) rather than the
 * former shallow `isValidAPIResponse` guard + silent `break`.
 */
export const fetchAllPages = <T>(
  store: Store<T>,
  fetchPage: (
    q: Query,
  ) => Effect.Effect<APIResponse<T>, FetchError | ResponseParseError>,
  params: Query,
  onPage?: (page: number, total: number | null) => void,
): Effect.Effect<readonly T[], FetchError | ResponseParseError> =>
  Effect.gen(function* () {
    const acc = yield* Ref.make<T[]>([]);
    // eslint-disable-next-line functional/no-loop-statements -- sequential pagination requires a loop
    while (yield* store.hasMorePages()) {
      params["page"] = yield* store.page;
      const raw: APIResponse<T> = yield* fetchPage(params);
      yield* Ref.update(acc, (xs) => [...xs, ...raw.results]);
      yield* store.addNewItems(raw);
      yield* store.incPage();
      const st = yield* store.current;
      yield* Effect.sync(() =>
        onPage?.(st.page - 1, st.totalPages > 0 ? st.totalPages : null),
      );
    }
    return yield* Ref.get(acc);
  });
