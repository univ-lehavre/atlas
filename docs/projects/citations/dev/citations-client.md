# Unified Client (atlas-citations)

`@univ-lehavre/atlas-citations` provides a unified API to query all bibliographic sources transparently.

> **See also:** [Unified Schema](./unified-schema.md) for the complete OpenAPI specification, common denominator analysis between sources, and detailed mapping.

## Installation

```bash
pnpm add @univ-lehavre/atlas-citations
```

## Structure

```
packages/citations/
├── specs/
│   └── citations.yaml              # Unified OpenAPI by entities
├── src/
│   ├── entities/                   # Unified schemas by entity
│   │   ├── work.ts                 # Publication/Article
│   │   ├── author.ts               # Author/Researcher
│   │   ├── institution.ts          # Institution/Organization
│   │   ├── source.ts               # Journal/Repository
│   │   └── funder.ts               # Funder
│   ├── adapters/                   # Source → unified transformation
│   │   ├── openalex-adapter.ts
│   │   ├── crossref-adapter.ts
│   │   ├── hal-adapter.ts
│   │   ├── arxiv-adapter.ts
│   │   └── orcid-adapter.ts
│   ├── resolver/                   # Identifier resolution
│   │   ├── doi-resolver.ts
│   │   ├── orcid-resolver.ts
│   │   └── multi-resolver.ts
│   ├── client/
│   │   ├── client.ts               # Unified client
│   │   └── source-selector.ts      # Automatic/manual selection
│   └── server/
│       └── routes/                 # Optional HTTP API
```

## Unified Entities

### Work (Publication)

```typescript
interface Work {
  id: string;                        // "openalex:W2741809807"
  source: SourceType;
  externalIds: ExternalIds;
  title: string;
  authors: WorkAuthor[];
  publicationDate?: string;
  venue?: string;
  abstract?: string;
  citationCount?: number;
  openAccess?: OpenAccessInfo;
  _raw: unknown;                     // Raw data from source
}
```

### Author

```typescript
interface Author {
  id: string;                        // "orcid:0000-0002-1825-0097"
  source: SourceType;
  externalIds: ExternalIds;
  displayName: string;
  affiliations?: Affiliation[];
  worksCount?: number;
  citationCount?: number;
  hIndex?: number;
  _raw: unknown;
}
```

### ExternalIds

```typescript
interface ExternalIds {
  doi?: string;
  orcid?: string;
  openalex?: string;
  hal?: string;
  arxiv?: string;
  ror?: string;
  issn?: string;
}
```

## Configuration

```typescript
import { createCitationsClient } from '@univ-lehavre/atlas-citations';

const client = createCitationsClient({
  sources: {
    openalex: { apiKey: process.env.OPENALEX_API_KEY },
    crossref: { mailto: 'your-email@example.com' },
    // hal, arxiv, orcid: optional configuration
  },
  defaultSources: ['openalex', 'crossref'],  // Default sources
  parallelRequests: true,                     // Query in parallel
  mergeStrategy: 'enrich',                    // 'first' | 'enrich'
});
```

## API

### Publication Search

```typescript
// Automatic search (intelligent source selection)
const works = yield* client.searchWorks('machine learning');

// Force specific sources
const halWorks = yield* client.searchWorks('deep learning', {
  sources: ['hal'],
});

// With pagination
const page2 = yield* client.searchWorks('neural networks', {
  page: 2,
  perPage: 50,
});
```

### Get a Publication

```typescript
// By DOI (automatically resolved via Crossref/OpenAlex)
const work = yield* client.getWork('10.1234/example');

// By specific ID
const openalexWork = yield* client.getWork('W2741809807');
const halWork = yield* client.getWork('hal-01234567', ['hal']);
```

### Author Search

```typescript
// Search by name
const authors = yield* client.searchAuthors('Marie Curie');

// By ORCID
const author = yield* client.getAuthor('0000-0002-1825-0097');

// Author's publications
const authorWorks = yield* client.getAuthorWorks('0000-0002-1825-0097');
```

### Institution Search

```typescript
const institutions = yield* client.searchInstitutions('Universite Le Havre');
```

### Universal Resolution

```typescript
// Automatically detects identifier type
const entity = yield* client.resolve('10.1234/example');      // DOI → Work
const entity = yield* client.resolve('0000-0002-1825-0097');  // ORCID → Author
const entity = yield* client.resolve('W2741809807');          // OpenAlex → Work
```

## Source Selection

### Automatic (default)

The client automatically selects the most relevant sources:

```typescript
// DOI → Crossref priority, then OpenAlex
client.getWork('10.1234/example');

// ORCID → ORCID then OpenAlex
client.getAuthor('0000-0002-1825-0097');

// HAL ID → HAL only
client.getWork('hal-01234567');

// ArXiv ID → ArXiv only
client.getWork('2301.12345');

// Text search → all relevant sources
client.searchWorks('machine learning');
```

### Forced by User

```typescript
// Force a single source
const halWorks = yield* client.searchWorks('machine learning', {
  sources: ['hal'],
});

// Force multiple sources
const works = yield* client.searchWorks('machine learning', {
  sources: ['openalex', 'crossref'],
});
```

## Monitoring

### Quotas

```typescript
const limits = yield* client.getRateLimits();
// {
//   openalex: { remaining: 99500, limit: 100000, resetAt: ... },
//   crossref: { remaining: 45, limit: 50, resetAt: ... },
//   hal: { remaining: null, limit: null, resetAt: null },
//   arxiv: { remaining: null, limit: null, resetAt: null },
//   orcid: { remaining: 9800, limit: 10000, resetAt: ... },
// }
```

### Source Health

```typescript
const health = yield* client.getSourceHealth();
// {
//   openalex: { status: 'healthy', latency: 120 },
//   crossref: { status: 'degraded', latency: 850 },
//   hal: { status: 'healthy', latency: 200 },
//   arxiv: { status: 'healthy', latency: 180 },
//   orcid: { status: 'down', latency: null },
// }
```

## Unified OpenAPI

The package exposes its own OpenAPI spec for the optional HTTP server:

```yaml
openapi: '3.1.0'
info:
  title: Atlas Citations API
  version: '1.0.0'

paths:
  /works:
    get:
      operationId: searchWorks
      parameters:
        - name: q
          in: query
          description: Search term
        - name: sources
          in: query
          description: Sources to query
          schema:
            type: array
            items:
              enum: [openalex, crossref, hal, arxiv, orcid]

  /works/{id}:
    get:
      operationId: getWork
      parameters:
        - name: id
          in: path
          description: DOI, OpenAlex ID, HAL ID, ArXiv ID

  /authors:
    get:
      operationId: searchAuthors

  /authors/{id}:
    get:
      operationId: getAuthor

  /resolve/{id}:
    get:
      operationId: resolveId
      description: Resolve an identifier to the corresponding entity
```

## HTTP Server (optional)

```typescript
import { createCitationsServer } from '@univ-lehavre/atlas-citations/server';

const server = createCitationsServer({
  port: 3000,
  client: createCitationsClient({ /* config */ }),
});

await server.listen();
// API available at http://localhost:3000
```

Endpoints:
- `GET /works?q=...&sources=...`
- `GET /works/:id`
- `GET /authors?q=...`
- `GET /authors/:id`
- `GET /authors/:id/works`
- `GET /institutions?q=...`
- `GET /resolve/:id`
- `GET /health`
