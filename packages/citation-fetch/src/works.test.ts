import { describe, it, expect } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import {
  FetchOnePage,
  type PageResult,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { getWorksCount, getInstitutionStats } from "./works.js";

const config = { userAgent: "test/1.0", apiURL: "https://api.openalex.org" };

// A FetchOnePage test layer (écart E14, ADR 0049) replacing the former
// vi.mock of the fetchOnePage import. Pages are returned in sequence from
// `responses`; each call is recorded in `calls` for assertions.
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

const metaResponse = (count: number): PageResult<unknown> => ({
  data: { meta: { count, db_response_time_ms: 10 } },
  rateLimit: undefined,
});

describe("getWorksCount", () => {
  it.effect("returns zero count for empty institutionIds", () =>
    Effect.gen(function* () {
      const { layer, calls } = makeFetchLayer([]);
      const result = yield* getWorksCount([], config).pipe(
        Effect.provide(layer),
      );
      expect(result.count).toBe(0);
      expect(result.institutionCount).toBe(0);
      expect(calls).toHaveLength(0);
    }),
  );

  it.effect("fetches works count for given institution IDs", () =>
    Effect.gen(function* () {
      const { layer } = makeFetchLayer([metaResponse(42)]);
      const result = yield* getWorksCount(["I1", "I2"], config).pipe(
        Effect.provide(layer),
      );
      expect(result.count).toBe(42);
      expect(result.institutionCount).toBe(2);
      expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }),
  );

  it.effect("falls back to default base URL when apiURL is not provided", () =>
    Effect.gen(function* () {
      const { layer, calls } = makeFetchLayer([metaResponse(7)]);
      yield* getWorksCount(["I1"], { userAgent: "test/1.0" }).pipe(
        Effect.provide(layer),
      );
      const [url] = calls[0]!;
      expect(url.toString()).toBe("https://api.openalex.org/works");
    }),
  );

  it.effect("includes api_key in params when configured", () =>
    Effect.gen(function* () {
      const { layer, calls } = makeFetchLayer([metaResponse(0)]);
      yield* getWorksCount(["I1"], { ...config, apiKey: "secret" }).pipe(
        Effect.provide(layer),
      );
      const [, params] = calls[0]!;
      expect(params["api_key"]).toBe("secret");
    }),
  );
});

describe("getInstitutionStats", () => {
  it.effect("returns zeroed stats for empty institutionIds", () =>
    Effect.gen(function* () {
      const { layer, calls } = makeFetchLayer([]);
      const result = yield* getInstitutionStats([], config).pipe(
        Effect.provide(layer),
      );
      expect(result.worksCount).toBe(0);
      expect(result.articlesCount).toBe(0);
      expect(result.authorsCount).toBe(0);
      expect(result.institutionCount).toBe(0);
      expect(result.articlesByYear).toContainEqual({
        year: "before",
        count: 0,
      });
      expect(calls).toHaveLength(0);
    }),
  );

  it.effect(
    "ignores group_by entries with non-numeric keys and future years",
    () =>
      Effect.gen(function* () {
        const groupByResponse: PageResult<unknown> = {
          data: {
            meta: { count: 3, db_response_time_ms: 5 },
            group_by: [
              { key: "unknown", key_display_name: "?", count: 999 },
              {
                key: String(new Date().getFullYear() + 100),
                key_display_name: "future",
                count: 1,
              },
              {
                key: String(new Date().getFullYear()),
                key_display_name: "current",
                count: 4,
              },
            ],
          },
          rateLimit: undefined,
        };
        const { layer } = makeFetchLayer([
          metaResponse(10),
          groupByResponse,
          metaResponse(2),
        ]);

        const result = yield* getInstitutionStats(["I1"], config).pipe(
          Effect.provide(layer),
        );
        expect(result.articlesCount).toBe(4);
        expect(
          result.articlesByYear.find((y) => y.year === "before")?.count,
        ).toBe(0);
      }),
  );

  it.effect("fetches stats in parallel and aggregates results", () =>
    Effect.gen(function* () {
      const groupByResponse: PageResult<unknown> = {
        data: {
          meta: { count: 3, db_response_time_ms: 5 },
          group_by: [
            {
              key: String(new Date().getFullYear()),
              key_display_name: "Current year",
              count: 10,
            },
            {
              key: String(new Date().getFullYear() - 1),
              key_display_name: "Last year",
              count: 20,
            },
            { key: "1990", key_display_name: "Before range", count: 5 },
          ],
        },
        rateLimit: undefined,
      };
      // works → articles group_by → authors, in Effect.all order.
      const { layer } = makeFetchLayer([
        metaResponse(100),
        groupByResponse,
        metaResponse(50),
      ]);

      const result = yield* getInstitutionStats(["I1"], config).pipe(
        Effect.provide(layer),
      );

      expect(result.worksCount).toBe(100);
      expect(result.authorsCount).toBe(50);
      expect(result.institutionCount).toBe(1);
      expect(
        result.articlesByYear.find((y) => y.year === "before")?.count,
      ).toBe(5);
      expect(result.articlesCount).toBeGreaterThan(0);
    }),
  );
});
