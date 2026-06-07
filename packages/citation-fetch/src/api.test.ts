import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Queue, Schema } from "effect";
import { fetchAPIResults, fetchAPIQueue } from "./api.js";

// Item schema for the {id} result shape used across these tests.
const ItemSchema = Schema.Struct({ id: Schema.String });

vi.mock("@univ-lehavre/atlas-fetch-one-api-page", () => ({
  fetchOnePage: vi.fn(),
}));

import { fetchOnePage } from "@univ-lehavre/atlas-fetch-one-api-page";

const mockFetch = vi.mocked(fetchOnePage);

describe("fetchAPIResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all pages with configured endpoint, query, and user agent", async () => {
    const calls: Array<[URL, Record<string, unknown>, string]> = [];

    mockFetch
      .mockImplementationOnce((url, query, userAgent) => {
        calls.push([url, { ...query }, userAgent]);
        return Effect.succeed({
          data: {
            meta: { count: 3, page: 1, per_page: 2 },
            results: [{ id: "W1" }, { id: "W2" }],
          },
          rateLimit: { limit: 10, remaining: 9, reset: 123 },
        });
      })
      .mockImplementationOnce((url, query, userAgent) => {
        calls.push([url, { ...query }, userAgent]);
        return Effect.succeed({
          data: {
            meta: { count: 3, page: 2, per_page: 2 },
            results: [{ id: "W3" }],
          },
          rateLimit: undefined,
        });
      });

    const pages: Array<[number, number | null]> = [];
    const rateLimits: unknown[] = [];

    const results = await Effect.runPromise(
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
      }),
    );

    expect(results).toEqual([{ id: "W1" }, { id: "W2" }, { id: "W3" }]);
    expect(pages).toEqual([
      [1, 2],
      [2, 2],
    ]);
    expect(rateLimits).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const [url, firstQuery, userAgent] = calls[0];
    expect(url.toString()).toBe("https://api.openalex.org/works");
    expect(firstQuery).toMatchObject({ search: "ocean", per_page: 2, page: 1 });
    expect(userAgent).toBe("atlas-test/1.0");
  });
});

describe("fetchAPIQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a store, queue, and worker that pages through the API and offers results to the queue", async () => {
    mockFetch
      .mockImplementationOnce(() =>
        Effect.succeed({
          data: {
            meta: { count: 2, page: 1, per_page: 2 },
            results: [{ id: "W1" }, { id: "W2" }],
          },
          rateLimit: undefined,
        }),
      )
      .mockImplementationOnce(() =>
        Effect.succeed({
          data: {
            meta: { count: 2, page: 2, per_page: 2 },
            results: [],
          },
          rateLimit: undefined,
        }),
      );

    const program = Effect.gen(function* () {
      const { store, queue, worker } = yield* fetchAPIQueue<{ id: string }>({
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
      return { drained: [...drained], store };
    });

    const { drained } = await Effect.runPromise(Effect.scoped(program));
    expect(drained).toEqual([{ id: "W1" }, { id: "W2" }]);
  });
});
