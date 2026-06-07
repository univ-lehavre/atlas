import { Effect, Either, ParseResult, Schema } from "effect";
import { http, HttpResponse } from "msw";
import {
  buildHeaders,
  buildURL,
  fetchOnePage,
  fetchJSON,
  URLToResponse,
  responseToJSON,
  parseRateLimitHeaders,
  FetchError,
} from "./index.js";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "@effect/vitest";

import { server } from "../tests/msw/server.js";

// Wire MSW lifecycle locally to keep the impact on vitest config minimal.
beforeAll(() => {
  // 'error' raises if a test hits an unintended URL : keeps the tests honest.
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const TEST_URL = "https://api.example.com/test";

describe("FetchError", () => {
  it("can be constructed without cause", () => {
    const err = new FetchError("oops");
    expect(err.message).toBe("oops");
    expect(err.name).toBe("FetchError");
  });
});

describe("buildURL", () => {
  it("should build a URL with query parameters", () => {
    const baseURL = new URL("https://api.example.com/data");
    const params = { search: "test", limit: 10 };
    const url = buildURL(baseURL, params);
    expect(url.toString()).toBe(
      "https://api.example.com/data?search=test&limit=10",
    );
  });
});

describe("buildHeaders", () => {
  it("should build headers with User-Agent", () => {
    const userAgent = "MyApp/1.0";
    const headers = buildHeaders(userAgent);
    expect(headers.get("User-Agent")).toBe(userAgent);
  });
});

describe("URLToResponse", () => {
  it.effect("should fetch a response successfully", () =>
    Effect.gen(function* () {
      server.use(
        http.get(TEST_URL, () => new HttpResponse("OK", { status: 200 })),
      );

      const url = new URL(TEST_URL);
      const headers = new Headers();

      const response = yield* URLToResponse(url, "GET", headers);
      expect(response.status).toBe(200);
      const text = yield* Effect.tryPromise(() => response.text());
      expect(text).toBe("OK");
    }),
  );

  it.effect("should return FetchError when fetch rejects", () =>
    Effect.gen(function* () {
      server.use(http.get(TEST_URL, () => HttpResponse.error()));

      const url = new URL(TEST_URL);
      const headers = new Headers();

      const either = yield* Effect.either(URLToResponse(url, "GET", headers));
      expect(either._tag).toBe("Left");
      if (either._tag === "Left") {
        expect(either.left.name).toBe("FetchError");
        expect(either.left.message).toBe(
          "An unknown error occurred during fetch",
        );
        const cause = (either.left as unknown as { cause?: unknown }).cause;
        expect(cause).toBeDefined();
      }
    }),
  );
});

describe("responseToJSON", () => {
  it.effect("should parse JSON response successfully", () =>
    Effect.gen(function* () {
      const mockData = { ok: true, items: [1, 2, 3] };
      server.use(http.get(TEST_URL, () => HttpResponse.json(mockData)));

      const url = new URL(TEST_URL);
      const headers = new Headers();

      const response = yield* URLToResponse(url, "GET", headers);
      const result = yield* responseToJSON(response, Schema.Unknown);
      expect(result).toEqual(mockData);
    }),
  );

  it.effect(
    "should return ResponseParseError when content-type is not application/json",
    () =>
      Effect.gen(function* () {
        const mockText = "not json";
        server.use(
          http.get(
            TEST_URL,
            () =>
              new HttpResponse(mockText, {
                status: 200,
                headers: { "content-type": "text/plain" },
              }),
          ),
        );

        const url = new URL(TEST_URL);
        const headers = new Headers();

        const response = yield* URLToResponse(url, "GET", headers);
        const either = yield* Effect.either(
          responseToJSON(response, Schema.Unknown),
        );
        expect(either._tag).toBe("Left");
        if (either._tag === "Left") {
          expect(either.left.name).toBe("ResponseParseError");
          expect(either.left.message).toBe(
            "An unknown error occurred during fetch",
          );
          const cause = (either.left as unknown as { cause?: unknown }).cause;
          expect(cause).toBeDefined();
          expect((cause as Error).message).toBe(mockText);
        }
      }),
  );

  it.effect(
    "should return ResponseParseError when response body is not valid JSON",
    () =>
      Effect.gen(function* () {
        // MSW intercepts at the network layer, so to trigger response.json()
        // failure we serve a malformed payload with a JSON content-type.
        server.use(
          http.get(
            TEST_URL,
            () =>
              new HttpResponse("not-json-at-all", {
                status: 200,
                headers: { "content-type": "application/json" },
              }),
          ),
        );

        const url = new URL(TEST_URL);
        const headers = new Headers();

        const response = yield* URLToResponse(url, "GET", headers);
        const either = yield* Effect.either(
          responseToJSON(response, Schema.Unknown),
        );
        expect(either._tag).toBe("Left");
        if (either._tag === "Left") {
          expect(either.left.name).toBe("ResponseParseError");
          expect(either.left.message).toBe(
            "An unknown error occurred during fetch",
          );
          const cause = (either.left as unknown as { cause?: unknown }).cause;
          expect(cause).toBeInstanceOf(Error);
        }
      }),
  );
});

describe("fetchJSON", () => {
  it.effect("should parse JSON response successfully", () =>
    Effect.gen(function* () {
      const mockData = { ok: true, items: [1, 2, 3] };
      server.use(http.get(TEST_URL, () => HttpResponse.json(mockData)));

      const url = new URL(TEST_URL);
      const headers = new Headers();

      const result = yield* fetchJSON(url, "GET", headers, Schema.Unknown);
      expect(result).toEqual(mockData);
    }),
  );

  it.effect("should return FetchError when fetch rejects", () =>
    Effect.gen(function* () {
      server.use(http.get(TEST_URL, () => HttpResponse.error()));

      const url = new URL(TEST_URL);
      const headers = new Headers();

      const either = yield* Effect.either(
        fetchJSON(url, "GET", headers, Schema.Unknown),
      );
      expect(either._tag).toBe("Left");
      if (either._tag === "Left") {
        expect(either.left.name).toBe("FetchError");
        expect(either.left.message).toBe(
          "An unknown error occurred during fetch",
        );
        const cause = (either.left as unknown as { cause?: unknown }).cause;
        expect(cause).toBeDefined();
      }
    }),
  );

  it.effect(
    "should return ResponseParseError when content-type is not application/json",
    () =>
      Effect.gen(function* () {
        const mockText = "not json";
        server.use(
          http.get(
            TEST_URL,
            () =>
              new HttpResponse(mockText, {
                status: 200,
                headers: { "content-type": "text/plain" },
              }),
          ),
        );

        const url = new URL(TEST_URL);
        const headers = new Headers();

        const either = yield* Effect.either(
          fetchJSON(url, "GET", headers, Schema.Unknown),
        );
        expect(either._tag).toBe("Left");
        if (either._tag === "Left") {
          expect(either.left.name).toBe("ResponseParseError");
          expect(either.left.message).toBe(
            "An unknown error occurred during fetch",
          );
          const cause = (either.left as unknown as { cause?: unknown }).cause;
          expect(cause).toBeDefined();
          expect((cause as Error).message).toBe(mockText);
        }
      }),
  );

  it.effect(
    "should return ResponseParseError when response body is not valid JSON",
    () =>
      Effect.gen(function* () {
        server.use(
          http.get(
            TEST_URL,
            () =>
              new HttpResponse("not-json-at-all", {
                status: 200,
                headers: { "content-type": "application/json" },
              }),
          ),
        );

        const url = new URL(TEST_URL);
        const headers = new Headers();

        const either = yield* Effect.either(
          fetchJSON(url, "GET", headers, Schema.Unknown),
        );
        expect(either._tag).toBe("Left");
        if (either._tag === "Left") {
          expect(either.left.name).toBe("ResponseParseError");
          expect(either.left.message).toBe(
            "An unknown error occurred during fetch",
          );
          const cause = (either.left as unknown as { cause?: unknown }).cause;
          expect(cause).toBeInstanceOf(Error);
        }
      }),
  );
});

describe("parseRateLimitHeaders", () => {
  it("returns RateLimitInfo when all headers are present", () => {
    const headers = new Headers({
      "X-RateLimit-Limit": "100",
      "X-RateLimit-Remaining": "95",
      "X-RateLimit-Credits-Used": "5",
      "X-RateLimit-Reset": "60",
    });
    const result = parseRateLimitHeaders(headers);
    expect(result).toEqual({
      limit: 100,
      remaining: 95,
      creditsUsed: 5,
      resetInSeconds: 60,
    });
  });

  it("returns undefined when some headers are missing", () => {
    const headers = new Headers({ "X-RateLimit-Limit": "100" });
    expect(parseRateLimitHeaders(headers)).toBeUndefined();
  });

  it("returns undefined when no headers are present", () => {
    expect(parseRateLimitHeaders(new Headers())).toBeUndefined();
  });
});

describe("responseToJSON with null content-type", () => {
  it.effect("parses response when content-type is null", () =>
    Effect.gen(function* () {
      const mockData = { value: 42 };
      // MSW (and undici) always set a content-type when serializing JSON, so
      // we use a HttpResponse body of `null` to defeat any default header.
      // We then attach `content-type: null` via Headers manipulation by
      // building a raw Response in the handler.
      server.use(
        http.get(TEST_URL, () => {
          const body = JSON.stringify(mockData);
          const response = new Response(body, { status: 200 });
          response.headers.delete("content-type");
          return response;
        }),
      );

      const url = new URL(TEST_URL);
      const headers = new Headers();
      const response = yield* URLToResponse(url, "GET", headers);
      const result = yield* responseToJSON(response, Schema.Unknown);
      expect(result).toEqual(mockData);
    }),
  );
});

describe("fetchOnePage", () => {
  it.effect("should fetch data successfully using a JSON list", () =>
    Effect.gen(function* () {
      const mockData = [{ id: 1, userId: 1, title: "test post" }];
      server.use(
        http.get("https://jsonplaceholder.typicode.com/posts", () =>
          HttpResponse.json(mockData),
        ),
      );

      const baseURL = new URL("https://jsonplaceholder.typicode.com/posts");
      const params = { userId: 1 };
      const userAgent = "MyApp/1.0";

      const { data } = yield* fetchOnePage(
        baseURL,
        params,
        userAgent,
        Schema.Unknown,
      );
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    }),
  );

  it.effect("should fetch one page from OpenAlex", () =>
    Effect.gen(function* () {
      const payload = {
        meta: { count: 2_000_000 },
        results: [
          { id: "W1" },
          { id: "W2" },
          { id: "W3" },
          { id: "W4" },
          { id: "W5" },
        ],
      };
      server.use(
        http.get("https://api.openalex.org/works", () =>
          HttpResponse.json(payload),
        ),
      );

      const baseURL = new URL("https://api.openalex.org/works");
      const params = { page: 1, "per-page": 5 } as const;
      const userAgent = "MyApp/1.0 (integration-test)";

      const PageSchema = Schema.Struct({
        meta: Schema.Struct({ count: Schema.Number }),
        results: Schema.Array(Schema.Struct({ id: Schema.String })),
      });
      const { data } = yield* fetchOnePage(
        baseURL,
        params,
        userAgent,
        PageSchema,
      );

      expect(data).toBeDefined();
      expect(data.meta).toBeDefined();
      expect(data.meta.count).toBeDefined();
      expect(data.meta.count).toBeGreaterThan(1_000_000);
      expect(data.results).toBeDefined();
      expect(data.results.length).toBeDefined();
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results.length).toStrictEqual(5);
    }),
  );

  it.effect(
    "fails loudly with a ResponseParseError carrying a ParseError when the payload does not match the schema",
    () =>
      // E13 (ADR 0047): the body is decoded with the supplied Schema instead of
      // an unchecked `as T`. A mismatching payload must surface a loud
      // ResponseParseError whose `cause` is the underlying Effect ParseError,
      // not silently pass through. This drives a REAL payload through
      // decodeUnknownEither (the other tests use total Schema.Unknown schemas).
      Effect.gen(function* () {
        const malformed = { meta: { count: "oops" }, results: [{ id: 1 }] };
        server.use(
          http.get("https://api.openalex.org/works", () =>
            HttpResponse.json(malformed),
          ),
        );

        const baseURL = new URL("https://api.openalex.org/works");
        const params = { page: 1, "per-page": 5 } as const;
        const userAgent = "MyApp/1.0 (integration-test)";

        // Strict schema: count must be a number, id must be a string.
        const PageSchema = Schema.Struct({
          meta: Schema.Struct({ count: Schema.Number }),
          results: Schema.Array(Schema.Struct({ id: Schema.String })),
        });

        const either = yield* Effect.either(
          fetchOnePage(baseURL, params, userAgent, PageSchema),
        );

        expect(Either.isLeft(either)).toBe(true);
        if (Either.isLeft(either)) {
          expect(either.left.name).toBe("ResponseParseError");
          expect(either.left.message).toBe(
            "Response did not match the expected schema",
          );
          // The cause is the real Effect ParseError produced by the decoder.
          expect(ParseResult.isParseError(either.left.cause)).toBe(true);
        }
      }),
  );

  it.effect("should include rate limit info when headers are present", () =>
    Effect.gen(function* () {
      const mockData = { results: [] };
      server.use(
        http.get(TEST_URL, () =>
          HttpResponse.json(mockData, {
            headers: {
              "X-RateLimit-Limit": "100",
              "X-RateLimit-Remaining": "99",
              "X-RateLimit-Credits-Used": "1",
              "X-RateLimit-Reset": "60",
            },
          }),
        ),
      );

      const { data, rateLimit } = yield* fetchOnePage(
        new URL(TEST_URL),
        {},
        "MyApp/1.0",
        Schema.Unknown,
      );
      expect(data).toEqual(mockData);
      expect(rateLimit).toEqual({
        limit: 100,
        remaining: 99,
        creditsUsed: 1,
        resetInSeconds: 60,
      });
    }),
  );

  it.effect("should handle fetch errors", () =>
    Effect.gen(function* () {
      server.use(
        http.get("https://example.com/invalid", () => HttpResponse.error()),
      );

      const baseURL = new URL("https://example.com/invalid");
      const params = {};
      const userAgent = "MyApp/1.0";

      const result = yield* Effect.either(
        fetchOnePage(baseURL, params, userAgent, Schema.Unknown),
      );
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.name).toBe("FetchError");
        expect(result.left.message).toBe(
          "An unknown error occurred during fetch",
        );
      }
    }),
  );
});
