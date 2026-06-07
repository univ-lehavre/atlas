import { describe, it, expect } from "@effect/vitest";
import { Effect, Fiber, Layer, Queue, Schema, TestClock } from "effect";
import {
  FetchOnePage,
  type PageResult,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { fetchAPIResults, fetchAPIQueue } from "./api.js";

// Item schema for the {id} result shape used across these tests.
const ItemSchema = Schema.Struct({ id: Schema.String });

// FetchOnePage test layer (écart E14, ADR 0049): returns the queued page
// results in order and records each call — replaces the former vi.mock of
// the fetchOnePage import.
const makeFetchLayer = (
  responses: ReadonlyArray<PageResult<unknown>>,
): {
  layer: Layer.Layer<FetchOnePage>;
  calls: Array<[URL, Record<string, unknown>, string]>;
} => {
  const calls: Array<[URL, Record<string, unknown>, string]> = [];
  let i = 0;
  const layer = Layer.succeed(FetchOnePage, (<A>(
    url: URL,
    params: Record<string, unknown>,
    userAgent: string,
    _schema: Schema.Schema<A>,
  ) => {
    calls.push([url, { ...params }, userAgent]);
    const next = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return Effect.succeed(next as PageResult<A>);
  }) as typeof FetchOnePage.Service);
  return { layer, calls };
};

describe("fetchAPIResults", () => {
  it.effect(
    "fetches all pages with configured endpoint, query, and user agent",
    () =>
      Effect.gen(function* () {
        const { layer, calls } = makeFetchLayer([
          {
            data: {
              meta: { count: 3, page: 1, per_page: 2 },
              results: [{ id: "W1" }, { id: "W2" }],
            },
            rateLimit: { limit: 10, remaining: 9, reset: 123 },
          },
          {
            data: {
              meta: { count: 3, page: 2, per_page: 2 },
              results: [{ id: "W3" }],
            },
            rateLimit: undefined,
          },
        ]);

        const pages: Array<[number, number | null]> = [];
        const rateLimits: unknown[] = [];

        // The rate limiter (limit 1 / 1s) blocks the 2nd page on a token. Under
        // it.effect the clock is virtual (TestClock), so we fork the fetch and
        // advance time to release the token deterministically — no real wait
        // (écart E14, ADR 0049 : TestClock pour le temps).
        const fiber = yield* Effect.fork(
          fetchAPIResults<{ id: string }>({
            apiURL: "https://api.openalex.org",
            endpoint: "works",
            userAgent: "atlas-test/1.0",
            rateLimit: { limit: 1, interval: "1 seconds" },
            fetchAPIOptions: { search: "ocean" },
            perPage: 2,
            itemSchema: ItemSchema,
            onPage: (page, total) => pages.push([page, total]),
            onRateLimit: (info) => rateLimits.push(info),
          }).pipe(Effect.provide(layer)),
        );
        yield* TestClock.adjust("2 seconds");
        const results = yield* Fiber.join(fiber);

        expect(results).toEqual([{ id: "W1" }, { id: "W2" }, { id: "W3" }]);
        expect(pages).toEqual([
          [1, 2],
          [2, 2],
        ]);
        expect(rateLimits).toHaveLength(1);
        expect(calls).toHaveLength(2);

        const [url, firstQuery, userAgent] = calls[0]!;
        expect(url.toString()).toBe("https://api.openalex.org/works");
        expect(firstQuery).toMatchObject({
          search: "ocean",
          per_page: 2,
          page: 1,
        });
        expect(userAgent).toBe("atlas-test/1.0");
      }),
  );
});

describe("fetchAPIQueue", () => {
  it.effect(
    "returns a store, queue, and worker that pages through the API and offers results to the queue",
    () =>
      Effect.gen(function* () {
        const { layer } = makeFetchLayer([
          {
            data: {
              meta: { count: 2, page: 1, per_page: 2 },
              results: [{ id: "W1" }, { id: "W2" }],
            },
            rateLimit: undefined,
          },
          {
            data: {
              meta: { count: 2, page: 2, per_page: 2 },
              results: [],
            },
            rateLimit: undefined,
          },
        ]);

        const program = Effect.gen(function* () {
          const { queue, worker } = yield* fetchAPIQueue<{ id: string }>({
            apiURL: "https://api.openalex.org",
            endpoint: "works",
            userAgent: "atlas-test/1.0",
            rateLimit: { limit: 1, interval: "1 seconds" },
            fetchAPIOptions: { search: "ocean" },
            perPage: 2,
            itemSchema: ItemSchema,
          });
          yield* worker;
          const drained = yield* Queue.takeAll(queue);
          return [...drained];
        });

        const drained = yield* Effect.scoped(program).pipe(
          Effect.provide(layer),
        );
        expect(drained).toEqual([{ id: "W1" }, { id: "W2" }]);
      }),
  );
});
