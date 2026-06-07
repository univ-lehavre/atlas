import { describe, it, expect } from "@effect/vitest";
import { Effect, ConfigProvider, Exit } from "effect";
import { getEnv } from "./config.js";

const provideConfig = <A, E>(
  effect: Effect.Effect<A, E, never>,
  values: Record<string, string>,
): Effect.Effect<A, E, never> =>
  Effect.withConfigProvider(
    effect,
    ConfigProvider.fromMap(new Map(Object.entries(values))),
  );

describe("getEnv", () => {
  it.effect("returns the parsed environment with all required keys", () =>
    Effect.gen(function* () {
      const env = yield* provideConfig(getEnv(), {
        USER_AGENT: "atlas-test/1.0",
        RATE_LIMIT: '{"limit":10,"interval":"1 seconds"}',
        OPENALEX_API_URL: "https://api.openalex.org",
        PER_PAGE: "25",
        DUCKDB_PATH: "/tmp/test.duckdb",
        OPENALEX_API_KEY: "secret",
      });

      expect(env).toEqual({
        user_agent: "atlas-test/1.0",
        rate_limit: { limit: 10, interval: "1 seconds" },
        per_page: 25,
        citation_api_url: "https://api.openalex.org",
        duckdb_path: "/tmp/test.duckdb",
        citation_api_key: "secret",
      });
    }),
  );

  it.effect("returns undefined for citation_api_key when not provided", () =>
    Effect.gen(function* () {
      const env = yield* provideConfig(getEnv(), {
        USER_AGENT: "atlas-test/1.0",
        RATE_LIMIT: '{"limit":10,"interval":"1 seconds"}',
        OPENALEX_API_URL: "https://api.openalex.org",
        PER_PAGE: "10",
        DUCKDB_PATH: "/tmp/test.duckdb",
      });

      expect(env.citation_api_key).toBeUndefined();
    }),
  );

  it.effect("fails when a required variable is missing", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        provideConfig(getEnv(), {
          RATE_LIMIT: '{"limit":10,"interval":"1 seconds"}',
          OPENALEX_API_URL: "https://api.openalex.org",
          PER_PAGE: "10",
          DUCKDB_PATH: "/tmp/test.duckdb",
        }),
      );

      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});
