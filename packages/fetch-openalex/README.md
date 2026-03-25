# @univ-lehavre/atlas-fetch-openalex

Central OpenAlex API client for the Atlas monorepo. Provides typed Effect-based functions for institutions, works, and authors — with `api_key` authentication and rate-limit header support.

## Installation

```bash
pnpm add @univ-lehavre/atlas-fetch-openalex
```

## Configuration

```typescript
import type { OpenAlexConfig } from '@univ-lehavre/atlas-fetch-openalex';

const config: OpenAlexConfig = {
  userAgent: 'my-app/1.0 (mailto:contact@example.com)',
  apiKey: process.env.OPENALEX_API_KEY,   // optional
  apiURL: 'https://api.openalex.org',     // optional, default
};
```

## API

### Institutions

#### `searchInstitutions(query, config)`

Searches institutions via the OpenAlex autocomplete endpoint.

```typescript
import { searchInstitutions } from '@univ-lehavre/atlas-fetch-openalex';
import { Effect } from 'effect';

const result = await Effect.runPromise(searchInstitutions('Le Havre', config));
// result.institutions: Institution[]
// result.rateLimit?: RateLimitInfo
```

### Works

#### `getWorksCount(institutionIds, config)`

Returns the count of articles from selected institutions over the last 5 years.

```typescript
const result = await Effect.runPromise(
  getWorksCount(['https://openalex.org/I123'], config)
);
// result.count, result.fromDate, result.rateLimit?
```

#### `getInstitutionStats(institutionIds, config)`

Fetches works count, articles by year, and authors count in 3 parallel requests.

```typescript
const stats = await Effect.runPromise(
  getInstitutionStats(['https://openalex.org/I123'], config)
);
// stats.worksCount, stats.articlesCount, stats.articlesByYear, stats.authorsCount
```

### Authors

| Function | Description |
|----------|-------------|
| `searchAuthorsByName(names, config)` | Search authors by display name |
| `searchAuthorsByORCID(orcids, config)` | Search authors by ORCID |
| `searchWorksByAuthorIDs(ids, config)` | Fetch works by author OpenAlex IDs |
| `searchWorksByORCID(orcid, config)` | Fetch works by author ORCID |
| `searchWorksByDOI(dois, config)` | Fetch works by DOI |

### Pagination (advanced)

For cursor-paginated requests across multiple pages:

| Export | Description |
|--------|-------------|
| `fetchAPIResults<T>(opts)` | Fetches all pages and returns results array |
| `fetchAPIQueue<T>(opts)` | Fetches into a queue for streaming |
| `FetchAPIMinimalConfig` | Configuration type for paginated requests |
