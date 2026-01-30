# Rate Limiting

Quota management is critical for bibliographic APIs. Each package implements uniform rate limiting handling.

## Limits by Source

| Source | Limit | Headers |
|--------|-------|---------|
| OpenAlex | 100k/day (with API key) | `X-Rate-Limit-*` |
| Crossref | 50 req/s (polite pool with email) | `X-Rate-Limit-Limit`, `X-Rate-Limit-Interval` |
| HAL | Undocumented | - |
| ArXiv | ~1 req/3s recommended | - |
| ORCID | Variable by tier | `X-RateLimit-*` |

## Typed Errors

```typescript
import { Data } from 'effect';

// Rate limit error (retryable)
export class RateLimitError extends Data.TaggedError('RateLimitError')<{
  readonly source: string;
  readonly retryAfter?: number;      // Seconds before retry
  readonly remaining?: number;        // Remaining requests
  readonly limit?: number;            // Total limit
  readonly resetAt?: Date;            // Quota reset time
}> {}

// Daily quota exhausted (non-retryable)
export class QuotaExhaustedError extends Data.TaggedError('QuotaExhaustedError')<{
  readonly source: string;
  readonly dailyLimit: number;
  readonly resetAt: Date;
}> {}
```

## Common Interface

All clients implement `RateLimitedClient`:

```typescript
interface RateLimitStatus {
  source: string;
  remaining: number;
  limit: number;
  resetAt: Date;
  usedToday: number;
}

interface RateLimitedClient {
  // Get current quota status
  getRateLimitStatus: () => Effect<RateLimitStatus, never>;

  // Wait for quota to become available
  waitForQuota: () => Effect<void, QuotaExhaustedError>;
}
```

## Retry Strategy

Retry is automatic with exponential backoff and jitter:

```typescript
import { Schedule, pipe } from 'effect';

const rateLimitRetrySchedule = pipe(
  Schedule.exponential('1 second'),
  Schedule.jittered,
  Schedule.whileInput<RateLimitError>((e) => e.retryAfter !== undefined),
  Schedule.compose(Schedule.recurs(5))
);
```

## Usage

### Check quotas

```typescript
import { createOpenAlexClient } from '@univ-lehavre/atlas-openalex';

const client = createOpenAlexClient({ apiKey: '...' });

// Get status
const status = yield* client.getRateLimitStatus();
console.log(`Remaining: ${status.remaining}/${status.limit}`);
console.log(`Reset at: ${status.resetAt}`);
```

### Handle quota errors

```typescript
import { Effect, Match } from 'effect';

const program = pipe(
  client.listWorks({ perPage: 100 }),
  Effect.catchTag('RateLimitError', (error) =>
    Effect.gen(function* () {
      console.log(`Rate limited, waiting ${error.retryAfter}s...`);
      yield* Effect.sleep(`${error.retryAfter} seconds`);
      return yield* client.listWorks({ perPage: 100 });
    })
  ),
  Effect.catchTag('QuotaExhaustedError', (error) =>
    Effect.fail(new Error(`Daily quota exhausted. Resets at ${error.resetAt}`))
  )
);
```

### Wait for quota

```typescript
// Wait for quota to become available
yield* client.waitForQuota();

// Then execute the request
const works = yield* client.listWorks();
```

## Crossref: Polite Pool

Crossref offers a better rate limit if you include an email in your requests:

```typescript
const client = createCrossrefClient({
  mailto: 'your-email@example.com',  // Activates the "polite pool"
});
```

With the polite pool:
- Increased limit
- Priority in the queue
- Notifications in case of issues

## OpenAlex: API Key

OpenAlex offers 100k requests/day with a free API key:

```typescript
const client = createOpenAlexClient({
  apiKey: process.env.OPENALEX_API_KEY,
});
```

Without an API key, the limit is IP-based and more restrictive.

## Monitoring in atlas-citations

The aggregator allows monitoring all quotas:

```typescript
import { createCitationsClient } from '@univ-lehavre/atlas-citations';

const client = createCitationsClient();

// Get quotas for all sources
const limits = yield* client.getRateLimits();
// {
//   openalex: { remaining: 99500, limit: 100000, resetAt: ... },
//   crossref: { remaining: 45, limit: 50, resetAt: ... },
//   hal: { remaining: null, limit: null, resetAt: null },
//   ...
// }

// Check source health
const health = yield* client.getSourceHealth();
// {
//   openalex: { status: 'healthy', latency: 120 },
//   crossref: { status: 'degraded', latency: 850 },
//   arxiv: { status: 'healthy', latency: 200 },
//   ...
// }
```
