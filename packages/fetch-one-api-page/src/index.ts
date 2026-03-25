import qs from "qs";
import { Effect, Data } from "effect";

type QueryValue =
  | string
  | number
  | boolean
  | (string | number | boolean)[]
  | undefined;
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

const responseToJSON = <T>(
  response: Response,
): Effect.Effect<T, ResponseParseError> =>
  Effect.tryPromise({
    try: async () => {
      const contentType = response.headers.get("content-type");
      // eslint-disable-next-line functional/no-conditional-statements -- early throw for non-JSON
      if (contentType !== null && !contentType.includes("application/json")) {
        const text = await response.text();
        throw new ResponseParseError(text);
      }
      const json = (await response.json()) as T;
      return json;
    },
    catch: (cause: unknown) =>
      new ResponseParseError("An unknown error occurred during fetch", {
        cause,
      }),
  });

/**
 * Fetch JSON data from a URL.
 * @param url The URL to fetch
 * @param method The HTTP method to use
 * @param headers The headers to include in the request
 * @returns The JSON response from the server
 */
const fetchJSON = <T>(
  url: URL,
  method: "GET" | "POST" | "PUT" | "DELETE",
  headers: Headers,
): Effect.Effect<T, FetchError | ResponseParseError> =>
  Effect.gen(function* () {
    const response: Response = yield* URLToResponse(url, method, headers);
    const json: T = yield* responseToJSON<T>(response);
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
const fetchOnePage = <T>(
  endpointURL: URL,
  params: Query,
  userAgent: string,
): Effect.Effect<PageResult<T>, FetchError | ResponseParseError> =>
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
    const data = yield* responseToJSON<T>(response);
    yield* Effect.logDebug(
      `Received response: ${JSON.stringify(data, null, 2)}`,
    );
    return { data, rateLimit };
  });

export {
  buildHeaders,
  buildURL,
  URLToResponse,
  responseToJSON,
  fetchJSON,
  fetchOnePage,
  parseRateLimitHeaders,
  FetchError,
  ResponseParseError,
  type Query,
  type RateLimitInfo,
  type PageResult,
};
