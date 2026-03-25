import { Effect } from "effect";
import {
  buildHeaders,
  buildURL,
  fetchOnePage,
  fetchJSON,
  URLToResponse,
  responseToJSON,
} from "./index.js";
import { it, describe, expect, afterEach } from "@effect/vitest";

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
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it.effect("should fetch a response successfully", () =>
    Effect.gen(function* () {
      const mockResponse = new Response("OK", { status: 200 });
      globalThis.fetch = (async () => mockResponse) as typeof fetch;

      const url = new URL("https://api.example.com/test");
      const headers = new Headers();

      const response = yield* URLToResponse(url, "GET", headers);
      expect(response.status).toBe(200);
      const text = yield* Effect.tryPromise(() => response.text());
      expect(text).toBe("OK");
    }),
  );

  it.effect("should return FetchError when fetch rejects", () =>
    Effect.gen(function* () {
      globalThis.fetch = (async () => {
        throw new Error("network fail");
      }) as typeof fetch;

      const url = new URL("https://api.example.com/test");
      const headers = new Headers();

      const either = yield* Effect.either(URLToResponse(url, "GET", headers));
      expect(either._tag).toBe("Left");
      if (either._tag === "Left") {
        expect(either.left.name).toBe("FetchError");
        expect(either.left.message).toBe(
          "An unknown error occurred during fetch",
        );
        const cause = (either.left as unknown as { cause?: unknown }).cause;
        expect(cause).toBeInstanceOf(Error);
        expect((cause as Error).message).toBe("network fail");
      }
    }),
  );
});

describe("responseToJSON", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it.effect("should parse JSON response successfully", () =>
    Effect.gen(function* () {
      const mockData = { ok: true, items: [1, 2, 3] };
      globalThis.fetch = (async () =>
        ({
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => mockData,
        }) as unknown as Response) as typeof fetch;

      const url = new URL("https://api.example.com/test");
      const headers = new Headers();

      const response = yield* URLToResponse(url, "GET", headers);
      const result = yield* responseToJSON<typeof mockData>(response);
      expect(result).toEqual(mockData);
    }),
  );

  it.effect(
    "should return ResponseParseError when content-type is not application/json",
    () =>
      Effect.gen(function* () {
        const mockText = "not json";
        globalThis.fetch = (async () =>
          ({
            headers: new Headers({ "content-type": "text/plain" }),
            text: async () => mockText,
          }) as unknown as Response) as typeof fetch;

        const url = new URL("https://api.example.com/test");
        const headers = new Headers();

        const response = yield* URLToResponse(url, "GET", headers);
        const either = yield* Effect.either(responseToJSON<unknown>(response));
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

  it.effect("should return ResponseParseError when response.json throws", () =>
    Effect.gen(function* () {
      globalThis.fetch = (async () =>
        ({
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => {
            throw new Error("bad json");
          },
        }) as unknown as Response) as typeof fetch;

      const url = new URL("https://api.example.com/test");
      const headers = new Headers();

      const response = yield* URLToResponse(url, "GET", headers);
      const either = yield* Effect.either(responseToJSON<unknown>(response));
      expect(either._tag).toBe("Left");
      if (either._tag === "Left") {
        expect(either.left.name).toBe("ResponseParseError");
        expect(either.left.message).toBe(
          "An unknown error occurred during fetch",
        );
        const cause = (either.left as unknown as { cause?: unknown }).cause;
        expect(cause).toBeInstanceOf(Error);
        expect((cause as Error).message).toBe("bad json");
      }
    }),
  );
});

describe("fetchJSON", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it.effect("should parse JSON response successfully", () =>
    Effect.gen(function* () {
      const mockData = { ok: true, items: [1, 2, 3] };
      globalThis.fetch = (async () =>
        ({
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => mockData,
        }) as unknown as Response) as typeof fetch;

      const url = new URL("https://api.example.com/test");
      const headers = new Headers();

      const result = yield* fetchJSON<typeof mockData>(url, "GET", headers);
      expect(result).toEqual(mockData);
    }),
  );

  it.effect("should return FetchError when fetch rejects", () =>
    Effect.gen(function* () {
      globalThis.fetch = (async () => {
        throw new Error("network fail");
      }) as typeof fetch;

      const url = new URL("https://api.example.com/test");
      const headers = new Headers();

      const either = yield* Effect.either(
        fetchJSON<unknown>(url, "GET", headers),
      );
      expect(either._tag).toBe("Left");
      if (either._tag === "Left") {
        expect(either.left.name).toBe("FetchError");
        expect(either.left.message).toBe(
          "An unknown error occurred during fetch",
        );
        const cause = (either.left as unknown as { cause?: unknown }).cause;
        expect(cause).toBeInstanceOf(Error);
        expect((cause as Error).message).toBe("network fail");
      }
    }),
  );

  it.effect(
    "should return ResponseParseError when content-type is not application/json",
    () =>
      Effect.gen(function* () {
        const mockText = "not json";
        globalThis.fetch = (async () =>
          ({
            headers: new Headers({ "content-type": "text/plain" }),
            text: async () => mockText,
          }) as unknown as Response) as typeof fetch;

        const url = new URL("https://api.example.com/test");
        const headers = new Headers();

        const either = yield* Effect.either(
          fetchJSON<unknown>(url, "GET", headers),
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

  it.effect("should return ResponseParseError when response.json throws", () =>
    Effect.gen(function* () {
      globalThis.fetch = (async () =>
        ({
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => {
            throw new Error("bad json");
          },
        }) as unknown as Response) as typeof fetch;

      const url = new URL("https://api.example.com/test");
      const headers = new Headers();

      const either = yield* Effect.either(
        fetchJSON<unknown>(url, "GET", headers),
      );
      expect(either._tag).toBe("Left");
      if (either._tag === "Left") {
        expect(either.left.name).toBe("ResponseParseError");
        expect(either.left.message).toBe(
          "An unknown error occurred during fetch",
        );
        const cause = (either.left as unknown as { cause?: unknown }).cause;
        expect(cause).toBeInstanceOf(Error);
        expect((cause as Error).message).toBe("bad json");
      }
    }),
  );
});

describe("fetchOnePage", () => {
  it.effect("should fetch data successfully using jsonplaceholder", () =>
    Effect.gen(function* () {
      const baseURL = new URL("https://jsonplaceholder.typicode.com/posts");
      const params = { userId: 1 };
      const userAgent = "MyApp/1.0";

      const { data } = yield* fetchOnePage<unknown[]>(
        baseURL,
        params,
        userAgent,
      );
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    }),
  );

  it.effect("should fetch one page from OpenAlex", () =>
    Effect.gen(function* () {
      const baseURL = new URL("https://api.openalex.org/works");
      const params = { page: 1, "per-page": 5 } as const;
      const userAgent = "MyApp/1.0 (integration-test)";

      const { data } = yield* fetchOnePage<any>(baseURL, params, userAgent);

      expect(data).toBeDefined();
      expect(data["meta"]).toBeDefined();
      expect(data["meta"]["count"]).toBeDefined();
      expect(data["meta"]["count"]).toBeGreaterThan(1_000_000);
      expect(data["results"]).toBeDefined();
      expect(data["results"].length).toBeDefined();
      expect(data["results"].length).toBeGreaterThan(0);
      expect(data["results"].length).toStrictEqual(5);
    }),
  );

  it.effect("should handle fetch errors", () =>
    Effect.gen(function* () {
      const baseURL = new URL("https://invalid.url");
      const params = {};
      const userAgent = "MyApp/1.0";

      const result = yield* Effect.either(
        fetchOnePage<unknown[]>(baseURL, params, userAgent),
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
