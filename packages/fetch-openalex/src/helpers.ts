import { Effect, RateLimiter, Queue, Ref } from "effect";
import type { FetchOpenAlexAPIOptions } from "@univ-lehavre/atlas-openalex-types";
import type {
  FetchError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  fetchOnePage,
  type Query,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { Store, type APIResponse, initialState, type IState } from "./store.js";

interface FetchAPIMinimalConfig {
  userAgent: string;
  rateLimit: RateLimiter.RateLimiter.Options;
  apiURL: string;
  endpoint: string;
  fetchAPIOptions: FetchOpenAlexAPIOptions;
  perPage: number;
  maxPages?: number;
}

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
          Effect.map((result) => result.data),
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
): Effect.Effect<void, FetchError | ResponseParseError> =>
  Effect.gen(function* () {
    // eslint-disable-next-line functional/no-loop-statements -- sequential pagination requires a loop
    while (yield* store.hasMorePages()) {
      params["page"] = yield* store.page;
      const response: APIResponse<T> = yield* fetchPage(params);
      yield* queue.offerAll(response.results);
      yield* store.addNewItems(response);
      yield* store.incPage();
    }
  });
