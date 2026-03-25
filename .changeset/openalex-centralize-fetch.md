---
"@univ-lehavre/atlas-fetch-openalex": minor
"@univ-lehavre/atlas-fetch-one-api-page": minor
"@univ-lehavre/atlas-openalex-types": minor
---

Centralize OpenAlex API client in `fetch-openalex` with `api_key` authentication and rate-limit header support.

- **`fetch-one-api-page`**: `fetchOnePage` now returns `{ data, rateLimit? }` instead of `T`. Rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Credits-Used`, `X-RateLimit-Reset`) are parsed and exposed.
- **`openalex-types`**: New `RateLimitInfo` interface. New `api_key` field in `FetchOpenAlexAPIOptions`.
- **`fetch-openalex`**: New functions — `searchInstitutions`, `getWorksCount`, `getInstitutionStats`, `searchAuthorsByName`, `searchAuthorsByORCID`, `searchWorksByAuthorIDs`, `searchWorksByORCID`, `searchWorksByDOI`. All accept an `OpenAlexConfig` with optional `apiKey`.
