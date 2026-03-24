import type { RateLimiter } from "effect";
import { Effect, Queue, Chunk } from "effect";
import type { FetchOpenAlexAPIOptions } from "@univ-lehavre/atlas-openalex-types";
import type {
  FetchError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { type Query } from "@univ-lehavre/atlas-fetch-one-api-page";
import type { Store } from "./store.js";
import {
  buildEndpointURL,
  buildInitialParams,
  ensureQueue,
  ensureStore,
  makeRateLimitedFetcher,
  makeWorker,
} from "./helpers.js";

interface FetchAPIMinimalConfig {
  userAgent: string;
  rateLimit: RateLimiter.RateLimiter.Options;
  apiURL: string;
  endpoint: string;
  fetchAPIOptions: FetchOpenAlexAPIOptions;
  perPage: number;
  maxPages?: number;
}

interface FetchAPIConfig<T> extends FetchAPIMinimalConfig {
  now?: boolean;
  store?: Store<T>;
  queue?: Queue.Queue<T>;
}

const fetchAPIQueue = <T>(opts: FetchAPIConfig<T>) =>
  Effect.scoped(
    Effect.gen(function* () {
      const url: URL = buildEndpointURL(opts.apiURL, opts.endpoint);
      const params: Query = buildInitialParams(opts);

      const curriedFetch = yield* makeRateLimitedFetcher<T>(
        url,
        opts.userAgent,
        opts.rateLimit,
      );

      const queue: Queue.Queue<T> = yield* ensureQueue<T>(opts.queue);
      const store: Store<T> = yield* ensureStore<T>({
        store: opts.store,
        maxPages: opts.maxPages,
      });

      const worker = makeWorker<T>(store, queue, curriedFetch, params);

      return { store, queue, worker };
    }),
  );

const fetchAPIResults = <T>(
  opts: FetchAPIMinimalConfig,
): Effect.Effect<readonly T[], FetchError | ResponseParseError> =>
  Effect.gen(function* () {
    const { queue, worker } = yield* fetchAPIQueue<T>({ ...opts });
    yield* Effect.all([worker], { concurrency: "unbounded", discard: true });
    const results = yield* Queue.takeAll(queue);
    return Chunk.toReadonlyArray(results);
  });

export {
  fetchAPIQueue,
  fetchAPIResults,
  type FetchAPIMinimalConfig,
  type FetchAPIConfig,
};

export { type APIResponse, initialState, type IState, Store } from "./store.js";
