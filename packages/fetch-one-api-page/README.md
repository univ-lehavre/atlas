# @univ-lehavre/atlas-fetch-one-api-page

Low-level HTTP Effect wrapper for paginated API requests. Handles URL building, headers, JSON parsing, and rate-limit header extraction.

## Installation

```bash
pnpm add @univ-lehavre/atlas-fetch-one-api-page
```

## Usage

```typescript
import { fetchOnePage } from '@univ-lehavre/atlas-fetch-one-api-page';

const result = await Effect.runPromise(
  fetchOnePage<MyResponse>(
    new URL('https://api.example.com/items'),
    { filter: 'type:article', per_page: 25 },
    'my-app/1.0 (mailto:contact@example.com)',
  ),
);

console.log(result.data);       // typed response body
console.log(result.rateLimit);  // X-RateLimit-* headers if present
```

## API

### `fetchOnePage<T>(endpointURL, params, userAgent)`

Fetches a single page from an API endpoint.

| Parameter | Type | Description |
|-----------|------|-------------|
| `endpointURL` | `URL` | Base URL of the endpoint |
| `params` | `Query` | Query parameters appended to the URL |
| `userAgent` | `string` | Value for the `User-Agent` header |

Returns `Effect<PageResult<T>, FetchError | ResponseParseError>` where `PageResult<T>` is:

```typescript
interface PageResult<T> {
  data: T;
  rateLimit?: RateLimitInfo;
}
```

### `parseRateLimitHeaders(headers)`

Extracts `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Credits-Used`, and `X-RateLimit-Reset` from response headers. Returns `RateLimitInfo | undefined`.

### `RateLimitInfo`

```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  creditsUsed: number;
  resetInSeconds: number;
}
```

### Lower-level utilities

| Export | Description |
|--------|-------------|
| `buildURL(baseUrl, params)` | Builds a URL with query string |
| `buildHeaders(userAgent)` | Creates `Headers` with `User-Agent` |
| `URLToResponse(url, method, headers)` | Performs the HTTP request |
| `responseToJSON<T>(response)` | Parses JSON from a `Response` |
| `fetchJSON<T>(url, method, headers)` | Combines request + JSON parse |
| `FetchError` | Tagged error for network failures |
| `ResponseParseError` | Tagged error for JSON parse failures |
