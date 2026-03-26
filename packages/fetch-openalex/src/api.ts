import { Effect, Queue, Chunk } from "effect";
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
  type FetchAPIMinimalConfig,
} from "./helpers.js";

interface FetchAPIConfig<T> extends FetchAPIMinimalConfig {
  now?: boolean;
  store?: Store<T>;
  queue?: Queue.Queue<T>;
}

const fetchAPIQueue = <T>(
  opts: FetchAPIConfig<T>,
): Effect.Effect<
  {
    store: Store<T>;
    queue: Queue.Queue<T>;
    worker: Effect.Effect<void, FetchError | ResponseParseError>;
  },
  FetchError | ResponseParseError
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const url: URL = buildEndpointURL(opts.apiURL, opts.endpoint);
      const params: Query = buildInitialParams(opts);

      const curriedFetch = yield* makeRateLimitedFetcher<T>(
        url,
        opts.userAgent,
        opts.rateLimit,
        opts.onRateLimit,
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
  Effect.scoped(
    Effect.gen(function* () {
      const url: URL = buildEndpointURL(opts.apiURL, opts.endpoint);
      const params: Query = buildInitialParams(opts);

      const curriedFetch = yield* makeRateLimitedFetcher<T>(
        url,
        opts.userAgent,
        opts.rateLimit,
        opts.onRateLimit,
      );

      const queue: Queue.Queue<T> = yield* ensureQueue<T>();
      const store: Store<T> = yield* ensureStore<T>({
        maxPages: opts.maxPages,
      });

      const worker = makeWorker<T>(store, queue, curriedFetch, params);
      yield* worker;

      const results = yield* Queue.takeAll(queue);
      return Chunk.toReadonlyArray(results);
    }),
  );

export { fetchAPIQueue, fetchAPIResults, type FetchAPIConfig };
