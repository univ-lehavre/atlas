# @univ-lehavre/atlas-openalex-types

TypeScript types, branded types, and API response interfaces for the OpenAlex API.

## Installation

```bash
pnpm add @univ-lehavre/atlas-openalex-types
```

## Usage

```typescript
import { asORCID, asOpenAlexID, type ORCID, type OpenAlexID } from '@univ-lehavre/atlas-openalex-types';

const orcid: ORCID = asORCID('https://orcid.org/0000-0001-2345-6789');
const id: OpenAlexID = asOpenAlexID('https://openalex.org/A123456789');
```

## API

### Branded types

| Export | Description |
|--------|-------------|
| `ORCID` | Branded `string` for ORCID identifiers |
| `OpenAlexID` | Branded `string` for OpenAlex identifiers |
| `asORCID(value)` | Casts a string to `ORCID` |
| `asOpenAlexID(value)` | Casts a string to `OpenAlexID` |

### API response types

| Export | Description |
|--------|-------------|
| `AuthorsResult` | Single author result from `/authors` |
| `AffiliationsResult` | Author affiliation entry |
| `WorksResult` | Single work result from `/works` |
| `IInstitution` | Institution object |
| `AuthorshipInstitution` | Institution within an authorship |
| `OpenalexResponse<T>` | Paginated API response wrapper |
| `RateLimitInfo` | Rate-limit headers parsed from responses |

### API parameter types

| Export | Description |
|--------|-------------|
| `FetchOpenAlexAPIOptions` | Query parameters for OpenAlex API requests (includes `api_key`, `search`, `filter`, `sort`, etc.) |
