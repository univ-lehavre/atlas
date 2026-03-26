import { Effect, RateLimiter, Queue, Ref } from "effect";
import type { FetchOpenAlexAPIOptions } from "@univ-lehavre/atlas-openalex-types";
import type {
  FetchError,
  ResponseParseError,
  RateLimitInfo,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  fetchOnePage,
  type Query,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { Store, type APIResponse, initialState, type IState } from "./store.js";

export type { RateLimitInfo } from "@univ-lehavre/atlas-fetch-one-api-page";

interface FetchAPIMinimalConfigBase {
  readonly userAgent: string;
  readonly rateLimit: RateLimiter.RateLimiter.Options;
  readonly apiURL: string;
  readonly endpoint: string;
  readonly fetchAPIOptions: FetchOpenAlexAPIOptions;
  readonly perPage: number;
  readonly maxPages?: number;
}

/** Called after each page with the latest rate limit info, if available. */
type OnRateLimit = (info: RateLimitInfo) => void;

/** Called after each page with the current page index and total pages (once known). */
type OnPage = (page: number, total: number | null) => void;

export type FetchAPIMinimalConfig = FetchAPIMinimalConfigBase & {
  readonly onRateLimit?: OnRateLimit;
  readonly onPage?: OnPage;
};

export const buildEndpointURL = (apiURL: string, endpoint: string): URL =>
  new URL(`${apiURL}/${endpoint}`);

export const buildInitialParams = (opts: FetchAPIMinimalConfig): Query => ({
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
  onRateLimit?: (info: RateLimitInfo) => void,
  deps?: {
    makeRateLimiter?: MakeRateLimiterFn;
    fetchOnePage?: FetchOnePageFn<T>;
  },
) =>
  Effect.gen(function* () {
    const makeLimiter = deps?.makeRateLimiter ?? RateLimiter.make;
    const foa: FetchOnePageFn<T> =
      deps?.fetchOnePage ??
      ((
        u,
        p,
        ua,
      ): Effect.Effect<APIResponse<T>, FetchError | ResponseParseError> =>
        fetchOnePage<APIResponse<T>>(u, p, ua).pipe(
          Effect.map((result) =>
            result.rateLimit !== undefined && onRateLimit !== undefined
              ? (onRateLimit(result.rateLimit), result.data)
              : result.data,
          ),
        ));

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
      const response: APIResponse<T> = yield* fetchPage(params);
      yield* Ref.update(acc, (xs) => [...xs, ...response.results]);
      yield* store.addNewItems(response);
      yield* store.incPage();
      const st = yield* store.current;
      yield* Effect.sync(() =>
        onPage?.(st.page - 1, st.totalPages > 0 ? st.totalPages : null),
      );
    }
    return yield* Ref.get(acc);
  });
