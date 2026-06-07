import { describe, it, expect } from "@effect/vitest";
import { Effect, Exit, Layer, Schema, ConfigProvider } from "effect";
import {
  FetchOnePage,
  FetchError as FetchOnePageError,
  type PageResult,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import type { Query } from "../types/index.js";
import { fetchAPI } from "./fetch-citation.js";

// FetchOnePage test layer (écart E14, ADR 0049): replaces the former vi.mock
// of the fetchOnePage import. Pages are returned in sequence; the last entry
// repeats so a single canned page can serve a `mockReturnValue`-style stub.
const makeFetchLayer = (
  responses: ReadonlyArray<Effect.Effect<PageResult<unknown>, Error>>,
): { layer: Layer.Layer<FetchOnePage>; count: () => number } => {
  let i = 0;
  const layer = Layer.succeed(FetchOnePage, (<A>(
    _url: URL,
    _params: Query,
    _userAgent: string,
    _schema: Schema.Schema<A>,
  ) => {
    const next = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return next as Effect.Effect<PageResult<A>, Error>;
  }) as typeof FetchOnePage.Service);
  return { layer, count: () => i };
};

const succeedPage = (
  data: unknown,
): Effect.Effect<PageResult<unknown>, Error> =>
  Effect.succeed({ data, rateLimit: undefined });

const provideConfig = <A, E>(
  effect: Effect.Effect<A, E, FetchOnePage>,
  fetchLayer: Layer.Layer<FetchOnePage>,
  extraEnv: ReadonlyArray<readonly [string, string]> = [],
): Effect.Effect<A, E, never> =>
  Effect.withConfigProvider(
    effect.pipe(Effect.provide(fetchLayer)),
    ConfigProvider.fromMap(
      new Map([
        ["USER_AGENT", "atlas-test/1.0"],
        ["RATE_LIMIT", '{"limit":100,"interval":"1 seconds"}'],
        ["OPENALEX_API_URL", "https://api.openalex.org"],
        ["PER_PAGE", "10"],
        ["DUCKDB_PATH", "/tmp/test.duckdb"],
        ...extraEnv,
      ]),
    ),
  );

const url = new URL("https://api.openalex.org/works");

describe("fetchAPI", () => {
  it.effect(
    "paginates until all pages are fetched and returns the aggregated response",
    () =>
      Effect.gen(function* () {
        const { layer, count } = makeFetchLayer([
          succeedPage({
            meta: { count: 3, page: 1, per_page: 2 },
            results: [{ id: "W1" }, { id: "W2" }],
          }),
          succeedPage({
            meta: { count: 3, page: 2, per_page: 2 },
            results: [{ id: "W3" }],
          }),
        ]);

        const params: Query = { search: "ocean" };
        const result = yield* provideConfig(
          fetchAPI<{ id: string }>(url, params, "works"),
          layer,
        );

        expect(result.results).toEqual([
          { id: "W1" },
          { id: "W2" },
          { id: "W3" },
        ]);
        expect(result.meta.count).toBe(3);
        expect(count()).toBe(2);
      }),
  );

  it.effect("injects api_key in params when configured", () =>
    Effect.gen(function* () {
      const { layer } = makeFetchLayer([
        succeedPage({ meta: { count: 0, page: 1, per_page: 10 }, results: [] }),
      ]);

      const params: Query = { search: "x" };
      yield* provideConfig(fetchAPI<unknown>(url, params, "works"), layer, [
        ["OPENALEX_API_KEY", "secret-key"],
      ]);

      expect((params as Record<string, unknown>)["api_key"]).toBe("secret-key");
    }),
  );

  it.effect(
    "fails with a StatusError when more than 10 000 results are returned",
    () =>
      Effect.gen(function* () {
        const bigPage = Array.from({ length: 10001 }, (_, i) => ({
          id: `W${i}`,
        }));
        const { layer } = makeFetchLayer([
          succeedPage({
            meta: { count: 20000, page: 1, per_page: 10001 },
            results: bigPage,
          }),
        ]);

        const exit = yield* Effect.exit(
          provideConfig(
            fetchAPI<unknown>(url, { search: "x" }, "items"),
            layer,
          ),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(exit.cause.toString()).toContain("10 000");
        }
      }),
  );

  it.effect("wraps fetch errors as FetchError", () =>
    Effect.gen(function* () {
      const { layer } = makeFetchLayer([
        Effect.fail(new FetchOnePageError("network down")),
      ]);

      const exit = yield* Effect.exit(
        provideConfig(fetchAPI<unknown>(url, { search: "x" }, "works"), layer),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause.toString()).toContain("fetch");
      }
    }),
  );
});
