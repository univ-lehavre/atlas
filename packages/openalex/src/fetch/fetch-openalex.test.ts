import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Exit, ConfigProvider } from "effect";
import type { Query } from "../types/index.js";

vi.mock("@univ-lehavre/atlas-fetch-one-api-page", () => ({
  fetchOnePage: vi.fn(),
  FetchError: class FetchOnePageError extends Error {},
  ResponseParseError: class ResponseParseError extends Error {},
}));

import { fetchOnePage } from "@univ-lehavre/atlas-fetch-one-api-page";
import { fetchAPI } from "./fetch-openalex.js";

const mockFetch = vi.mocked(fetchOnePage);

type FetchReturn = ReturnType<typeof fetchOnePage>;

const succeedPage = <T>(data: T): FetchReturn =>
  Effect.succeed({ data, rateLimit: undefined }) as FetchReturn;

const failFetch = (cause: Error): FetchReturn =>
  Effect.fail(cause as never) as FetchReturn;

const provideConfig = <A, E>(
  effect: Effect.Effect<A, E, never>,
): Effect.Effect<A, E, never> =>
  Effect.withConfigProvider(
    effect,
    ConfigProvider.fromMap(
      new Map([
        ["USER_AGENT", "atlas-test/1.0"],
        ["RATE_LIMIT", '{"limit":100,"interval":"1 seconds"}'],
        ["OPENALEX_API_URL", "https://api.openalex.org"],
        ["PER_PAGE", "10"],
        ["DUCKDB_PATH", "/tmp/test.duckdb"],
      ]),
    ),
  );

beforeEach(() => {
  vi.clearAllMocks();
});

const url = new URL("https://api.openalex.org/works");

describe("fetchAPI", () => {
  it("paginates until all pages are fetched and returns the aggregated response", async () => {
    mockFetch
      .mockReturnValueOnce(
        succeedPage({
          meta: { count: 3, page: 1, per_page: 2 },
          results: [{ id: "W1" }, { id: "W2" }],
        }),
      )
      .mockReturnValueOnce(
        succeedPage({
          meta: { count: 3, page: 2, per_page: 2 },
          results: [{ id: "W3" }],
        }),
      );

    const params: Query = { search: "ocean" };
    const result = await Effect.runPromise(
      provideConfig(fetchAPI<{ id: string }>(url, params, "works")),
    );

    expect(result.results).toEqual([{ id: "W1" }, { id: "W2" }, { id: "W3" }]);
    expect(result.meta.count).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("injects api_key in params when configured", async () => {
    mockFetch.mockReturnValue(
      succeedPage({ meta: { count: 0, page: 1, per_page: 10 }, results: [] }),
    );

    const params: Query = { search: "x" };
    await Effect.runPromise(
      Effect.withConfigProvider(
        fetchAPI<unknown>(url, params, "works"),
        ConfigProvider.fromMap(
          new Map([
            ["USER_AGENT", "atlas-test/1.0"],
            ["RATE_LIMIT", '{"limit":100,"interval":"1 seconds"}'],
            ["OPENALEX_API_URL", "https://api.openalex.org"],
            ["PER_PAGE", "10"],
            ["DUCKDB_PATH", "/tmp/test.duckdb"],
            ["OPENALEX_API_KEY", "secret-key"],
          ]),
        ),
      ),
    );

    expect((params as Record<string, unknown>)["api_key"]).toBe("secret-key");
  });

  it("fails with a StatusError when more than 10 000 results are returned", async () => {
    const bigPage = Array.from({ length: 10001 }, (_, i) => ({ id: `W${i}` }));
    mockFetch.mockReturnValue(
      succeedPage({
        meta: { count: 20000, page: 1, per_page: 10001 },
        results: bigPage,
      }),
    );

    const exit = await Effect.runPromiseExit(
      provideConfig(fetchAPI<unknown>(url, { search: "x" }, "items")),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(exit.cause.toString()).toContain("10 000");
    }
  });

  it("wraps fetch errors as FetchError", async () => {
    mockFetch.mockReturnValue(failFetch(new Error("network down")));

    const exit = await Effect.runPromiseExit(
      provideConfig(fetchAPI<unknown>(url, { search: "x" }, "works")),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(exit.cause.toString()).toContain("fetch");
    }
  });
});
