import qs from "qs";
import { Effect, Data, Either, Schema, Context, Layer } from "effect";
import type { ParseResult } from "effect";

type QueryValue =
  string | number | boolean | (string | number | boolean)[] | undefined;
type Query = Record<string, QueryValue>;

/**
 * Error thrown when the fetch function fails.
 */
class FetchError extends Data.TaggedError("FetchError") {
  constructor(message: string, opts?: { cause?: unknown }) {
    super();
    this.message = message;
    this.name = "FetchError";
    // eslint-disable-next-line functional/no-conditional-statements -- constructor initialization
    if (opts?.cause !== undefined) this.cause = opts.cause;
  }
}

class ResponseParseError extends Data.TaggedError("ResponseParseError") {
  constructor(message: string, opts?: { cause?: unknown }) {
    super();
    this.message = message;
    this.name = "ResponseParseError";
    // eslint-disable-next-line functional/no-conditional-statements -- constructor initialization
    if (opts?.cause !== undefined) this.cause = opts.cause;
  }
}

/**
 * Build the full URL with query parameters.
 * @param base_url The base URL of the API endpoint
 * @param params Parameters to add to the URL
 * @returns The full URL with query parameters
 */
const buildURL = (baseUrl: URL, params: Query): URL => {
  const search_params: string = qs.stringify(params);
  const url_string = `${baseUrl.toString()}?${search_params}`;
  const url: URL = new URL(url_string);
  return url;
};

/**
 * Build the headers for the API request.
 * @param user_agent The name of the application making the request
 * @returns Headers with the User-Agent set
 */
const buildHeaders = (userAgent: string): Headers => {
  const headers: Headers = new Headers();
  headers.append("User-Agent", userAgent);
  return headers;
};

const URLToResponse = (
  url: URL,
  method: "GET" | "POST" | "PUT" | "DELETE",
  headers: Headers,
): Effect.Effect<Response, FetchError> =>
  Effect.tryPromise({
    try: async () => {
      const response: Response = await fetch(url, {
        method,
        headers,
      });
      return response;
    },
    catch: (cause: unknown) =>
      new FetchError("An unknown error occurred during fetch", { cause }),
  });

/**
 * Reads the response body as JSON and **decodes** it with the supplied Effect
 * `Schema` (écart E13, ADR 0047) — no more unchecked `as T`. A decode failure
 * yields a `ResponseParseError` carrying the underlying `ParseError` as its
 * `cause`, so callers can inspect exactly which field was malformed.
 */
const responseToJSON = <A>(
  response: Response,
  schema: Schema.Schema<A>,
): Effect.Effect<A, ResponseParseError> =>
  Effect.tryPromise({
    try: async (): Promise<unknown> => {
      const contentType = response.headers.get("content-type");
      // eslint-disable-next-line functional/no-conditional-statements -- early throw for non-JSON
      if (contentType !== null && !contentType.includes("application/json")) {
        const text = await response.text();
        throw new ResponseParseError(text);
      }
      return await response.json();
    },
    catch: (cause: unknown) =>
      new ResponseParseError("An unknown error occurred during fetch", {
        cause,
      }),
  }).pipe(
    Effect.flatMap((json) => {
      const decoded: Either.Either<A, ParseResult.ParseError> =
        Schema.decodeUnknownEither(schema)(json);
      return Either.isRight(decoded)
        ? Effect.succeed(decoded.right)
        : Effect.fail(
            new ResponseParseError(
              "Response did not match the expected schema",
              {
                cause: decoded.left,
              },
            ),
          );
    }),
  );

/**
 * Fetch JSON data from a URL.
 * @param url The URL to fetch
 * @param method The HTTP method to use
 * @param headers The headers to include in the request
 * @returns The JSON response from the server
 */
const fetchJSON = <A>(
  url: URL,
  method: "GET" | "POST" | "PUT" | "DELETE",
  headers: Headers,
  schema: Schema.Schema<A>,
): Effect.Effect<A, FetchError | ResponseParseError> =>
  Effect.gen(function* () {
    const response: Response = yield* URLToResponse(url, method, headers);
    const json: A = yield* responseToJSON(response, schema);
    return json;
  });

interface RateLimitInfo {
  limit: number;
  remaining: number;
  creditsUsed: number;
  resetInSeconds: number;
}

interface PageResult<T> {
  data: T;
  rateLimit?: RateLimitInfo;
}

const parseRateLimitHeaders = (headers: Headers): RateLimitInfo | undefined => {
  const limit = headers.get("X-RateLimit-Limit");
  const remaining = headers.get("X-RateLimit-Remaining");
  const creditsUsed = headers.get("X-RateLimit-Credits-Used");
  const reset = headers.get("X-RateLimit-Reset");
  return limit !== null &&
    remaining !== null &&
    creditsUsed !== null &&
    reset !== null
    ? {
        limit: Number.parseInt(limit, 10),
        remaining: Number.parseInt(remaining, 10),
        creditsUsed: Number.parseInt(creditsUsed, 10),
        resetInSeconds: Number.parseInt(reset, 10),
      }
    : undefined;
};

/**
 * Fetch one page of results from an API endpoint.
 * @param endpointURL The base URL of the API endpoint
 * @param params Parameters to add to the URL
 * @param userAgent The name of the application making the request
 * @throws {FetchError} If the fetch function fails
 * @returns An Effect that resolves to the JSON response with rate limit info or an error
 */
const fetchOnePage = <A>(
  endpointURL: URL,
  params: Query,
  userAgent: string,
  schema: Schema.Schema<A>,
): Effect.Effect<PageResult<A>, FetchError | ResponseParseError> =>
  Effect.gen(function* () {
    yield* Effect.logDebug(
      `Starting fetchOnePage with parameters: ${JSON.stringify({ endpointURL, params, userAgent }, null, 2)}`,
    );
    const url: URL = buildURL(endpointURL, params);
    const headers: Headers = buildHeaders(userAgent);
    yield* Effect.logInfo(`Fetching URL: ${url.toString()}`);
    yield* Effect.logDebug(
      `Using headers: ${JSON.stringify(headers, null, 2)}`,
    );
    const response: Response = yield* URLToResponse(url, "GET", headers);
    const rateLimit = parseRateLimitHeaders(response.headers);
    const data = yield* responseToJSON(response, schema);
    yield* Effect.logDebug(
      `Received response: ${JSON.stringify(data, null, 2)}`,
    );
    return { data, rateLimit };
  });

/**
 * Generic signature of {@link fetchOnePage}, kept as a named type so it can be
 * carried by the {@link FetchOnePage} service tag and overridden by test
 * layers (écart E14, ADR 0049).
 */
type FetchOnePageFn = <A>(
  endpointURL: URL,
  params: Query,
  userAgent: string,
  schema: Schema.Schema<A>,
) => Effect.Effect<PageResult<A>, FetchError | ResponseParseError>;

/**
 * Effect service exposing one-page fetching as an injected dependency
 * (écart E14, ADR 0049). Consumers `yield* FetchOnePage` instead of importing
 * the function directly, so production provides {@link FetchOnePageLive} at the
 * composition root and tests provide an in-memory layer — no `vi.mock`.
 */
class FetchOnePage extends Context.Tag("FetchOnePage")<
  FetchOnePage,
  FetchOnePageFn
>() {}

/** Layer providing the real network-backed {@link fetchOnePage}. */
const FetchOnePageLive: Layer.Layer<FetchOnePage> = Layer.succeed(
  FetchOnePage,
  fetchOnePage,
);

export {
  buildHeaders,
  buildURL,
  URLToResponse,
  responseToJSON,
  fetchJSON,
  fetchOnePage,
  FetchOnePage,
  FetchOnePageLive,
  parseRateLimitHeaders,
  FetchError,
  ResponseParseError,
  type FetchOnePageFn,
  type Query,
  type RateLimitInfo,
  type PageResult,
};
