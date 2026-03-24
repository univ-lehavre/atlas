import { describe, it, expect } from "@effect/vitest";
import { assertEquals } from "@effect/vitest/utils";
import { vi } from "vitest";
import { Effect, Queue, Ref, RateLimiter } from "effect";
import type { Query } from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  buildEndpointURL,
  buildInitialParams,
  ensureQueue,
  ensureStore,
  makeWorker,
  makeRateLimitedFetcher,
} from "./helpers.js";
import { Store, type APIResponse, initialState } from "./store.js";

interface Dummy {
  value: number;
}

describe("helpers", () => {
  it("buildEndpointURL builds a proper URL", () => {
    const url = buildEndpointURL("https://api.openalex.org", "works");
    expect(url).toBeInstanceOf(URL);
    assertEquals(url.toString(), "https://api.openalex.org/works");
  });

  it("buildInitialParams merges options with per_page", () => {
    const params = buildInitialParams({
      apiURL: "https://api.openalex.org",
      endpoint: "works",
      perPage: 25,
      userAgent: "tester/1.0",
      rateLimit: {} as unknown as RateLimiter.RateLimiter.Options,
      fetchAPIOptions: { search: "term", filter: "type:article" },
    });
    assertEquals(params.per_page, 25);
    assertEquals(params.search as string, "term");
    assertEquals(params.filter as string, "type:article");
  });

  it("buildInitialParams does not mutate input options", () => {
    const options = { search: "term" } as Record<string, unknown>;
    const params = buildInitialParams({
      apiURL: "https://api.openalex.org",
      endpoint: "works",
      perPage: 10,
      userAgent: "tester/1.0",
      rateLimit: {} as unknown as RateLimiter.RateLimiter.Options,
      fetchAPIOptions: options,
    });
    expect(options).not.toHaveProperty("per_page");
    assertEquals(params.per_page, 10);
    assertEquals(params.search as string, "term");
  });

  it.effect("ensureQueue returns provided queue or creates a new one", () =>
    Effect.gen(function* () {
      const provided = yield* Queue.unbounded<number>();
      const same = yield* ensureQueue<number>(provided);
      expect(same).toBe(provided);

      const created = yield* ensureQueue<number>(undefined);
      expect(created).toBeDefined();
      expect(created).toBeTypeOf(typeof Queue);
    }),
  );

  it.effect(
    "ensureStore returns provided store or initializes with maxPages",
    () =>
      Effect.gen(function* () {
        const provided = yield* Effect.andThen(
          Ref.make(initialState),
          (s) => new Store<Dummy>(s),
        );
        const same = yield* ensureStore<Dummy>({ store: provided });
        expect(same).toBe(provided);

        const created = yield* ensureStore<Dummy>({ maxPages: 3 });
        const st = yield* created.current;
        assertEquals(st.maxPages, 3);
        assertEquals(st.page, initialState.page);
        assertEquals(st.fetchedItems, initialState.fetchedItems);
      }),
  );

  it.effect("makeWorker processes pages and enqueues results", () =>
    Effect.gen(function* () {
      const store = yield* Effect.andThen(
        Ref.make(initialState),
        (s) => new Store<number>(s),
      );
      const queue = yield* Queue.unbounded<number>();

      const fetchPage = (q: Query) =>
        Effect.sync(() => {
          const page = (q.page as number) ?? 1;
          const per = 10;
          const count = 25;
          const start = (page - 1) * per;
          const end = Math.min(start + per, count);
          const results = Array.from(
            { length: end - start },
            (_, i) => start + i,
          );
          return {
            meta: { count, page, per_page: per },
            results,
          } satisfies APIResponse<number>;
        });

      const params: Query = { per_page: 10 };
      const worker = makeWorker<number>(store, queue, fetchPage, params);

      yield* worker;

      const all = yield* Queue.takeAll(queue);
      assertEquals(all.length, 25);
      const st = yield* store.current;
      assertEquals(st.totalPages, 3);
      assertEquals(st.fetchedItems, 25);
      assertEquals(st.page, 4);
    }),
  );

  it.effect(
    "makeWorker does nothing when hasMorePages is initially false (maxPages=0)",
    () =>
      Effect.gen(function* () {
        const s: IState = { ...initialState, maxPages: 0 };
        const store = yield* Effect.andThen(
          Ref.make(s),
          (r) => new Store<number>(r),
        );
        const queue = yield* Queue.unbounded<number>();
        const fetchPage = vi.fn<
          (
            q: Query,
          ) => Effect.Effect<
            APIResponse<number>,
            | import("@univ-lehavre/atlas-fetch-one-api-page").FetchError
            | import("@univ-lehavre/atlas-fetch-one-api-page").ResponseParseError,
            never
          >
        >(() => {
          const eff = Effect.sync(() => ({
            meta: { count: 0, page: 1, per_page: 1 },
            results: [],
          }));
          return eff as unknown as Effect.Effect<
            APIResponse<number>,
            | import("@univ-lehavre/atlas-fetch-one-api-page").FetchError
            | import("@univ-lehavre/atlas-fetch-one-api-page").ResponseParseError,
            never
          >;
        });
        const params: Query = { per_page: 10 };
        const worker = makeWorker<number>(store, queue, fetchPage, params);

        yield* worker;

        expect(fetchPage).not.toHaveBeenCalled();
        const all = yield* Queue.takeAll(queue);
        assertEquals(all.length, 0);
        const st = yield* store.current;
        assertEquals(st.page, 1);
      }),
  );

  it.effect(
    "makeRateLimitedFetcher returns a curried fetch that delegates to fetchOnePage",
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const identityLimiter: RateLimiter.RateLimiter = <R, E, A>(
            task: Effect.Effect<A, E, R>,
          ): Effect.Effect<A, E, R> => task;
          const makeRateLimiter = vi.fn(() => Effect.succeed(identityLimiter));

          const fakeResponse: APIResponse<Dummy> = {
            meta: { count: 1, page: 1, per_page: 1 },
            results: [{ value: 42 }],
          };
          const fetchOnePage = vi.fn(() => Effect.succeed(fakeResponse));

          const url = buildEndpointURL("https://api.openalex.org", "works");
          const fetcher = yield* makeRateLimitedFetcher<Dummy>(
            url,
            "tester/1.0",
            {} as unknown as RateLimiter.RateLimiter.Options,
            { makeRateLimiter, fetchOnePage },
          );
          const q: Query = { search: "x" } as Query;
          const out = yield* fetcher(q);

          expect(makeRateLimiter).toHaveBeenCalledOnce();
          expect(fetchOnePage).toHaveBeenCalledOnce();
          const [[calledUrl, calledQuery, calledUA]] = fetchOnePage.mock
            .calls as unknown as [[URL, Query, string]];
          expect(calledUrl.toString()).toBe(url.toString());
          assertEquals(calledQuery, q);
          assertEquals(calledUA, "tester/1.0");
          assertEquals(out, fakeResponse);
        }),
      ),
  );
});

// Re-export IState for test file usage
import type { IState } from "./store.js";
export type { IState };
