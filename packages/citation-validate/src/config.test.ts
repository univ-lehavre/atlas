import { afterEach } from "vitest";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { getEnv } from "./config.js";

const keys = [
  "USER_AGENT",
  "RATE_LIMIT",
  "API_URL",
  "RESULTS_PER_PAGE",
  "OPENALEX_API_KEY",
] as const;

const originalEnv = Object.fromEntries(
  keys.map((key) => [key, process.env[key]]),
);

const restoreEnv = () => {
  for (const key of keys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

describe("getEnv", () => {
  afterEach(() => {
    restoreEnv();
  });

  it.effect("reads and parses required OpenAlex configuration", () =>
    Effect.gen(function* () {
      process.env.USER_AGENT = "atlas-test/1.0";
      process.env.RATE_LIMIT = '{"limit":2,"interval":"1 second"}';
      process.env.API_URL = "https://api.openalex.test";
      process.env.RESULTS_PER_PAGE = "50";
      process.env.OPENALEX_API_KEY = "secret";

      const result = yield* getEnv();

      expect(result).toEqual({
        userAgent: "atlas-test/1.0",
        rateLimit: { limit: 2, interval: "1 second" },
        perPage: 50,
        apiURL: "https://api.openalex.test",
        apiKey: "secret",
      });
    }),
  );

  it.effect(
    "leaves apiKey undefined when OPENALEX_API_KEY is not configured",
    () =>
      Effect.gen(function* () {
        process.env.USER_AGENT = "atlas-test/1.0";
        process.env.RATE_LIMIT = '{"limit":1,"interval":"1 minute"}';
        process.env.API_URL = "https://api.openalex.test";
        process.env.RESULTS_PER_PAGE = "25";
        delete process.env.OPENALEX_API_KEY;

        const result = yield* getEnv();

        expect(result.apiKey).toBeUndefined();
      }),
  );
});
