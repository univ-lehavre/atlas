# Architecture

This document describes the structure of atlas-* packages and implementation patterns.

> **See also:**
> - [Overview](./index.md) - Technical introduction to Atlas Citations
> - [OpenAPI Lifecycle](./openapi-lifecycle.md) - Alpha to beta to stable process
> - [Unified Schema](./unified-schema.md) - Entities and OpenAPI specification
>
> **User documentation:** [Atlas Verify User Guide](../user/) - Documentation for researchers

## Structure of an atlas-* package

Each source package follows the same structure:

```
packages/{source}/
├── specs/
│   ├── alpha/                      # Specs in progress
│   ├── beta/                       # Specs under validation
│   ├── stable/                     # Validated specs
│   │   └── {source}-{version}.yaml
│   └── current.yaml                # Symlink → stable/{latest}
├── src/
│   ├── client/
│   │   ├── generated/types.ts      # Generated types (openapi-typescript)
│   │   ├── brands.ts               # Specific branded types
│   │   ├── client.ts               # Effect client
│   │   ├── errors.ts               # Typed errors + RateLimitError
│   │   ├── rate-limit.ts           # Quota management and retry
│   │   ├── types.ts                # Interfaces
│   │   └── index.ts
│   ├── cli/
│   │   └── index.ts                # Connectivity test CLI
│   ├── bin/
│   │   └── atlas-{source}.ts       # Entry point
│   └── index.ts
├── test/
│   ├── client.test.ts              # Unit tests
│   └── api.test.ts                 # Tests against real API
├── package.json
└── tsconfig.json
```

## OpenAPI Specs Status by Source

| Source | Official OpenAPI | Action |
|--------|-----------------|--------|
| **OpenAlex** | No | Create from scratch |
| **Crossref** | [Swagger UI](https://api.crossref.org/swagger-ui) | Retrieve and adapt |
| **HAL** | No (Solr API) | Create from scratch |
| **ArXiv** | No (Atom/XML API) | Create from scratch |
| **ORCID** | Temporarily unavailable | Create from scratch |

## Detailed Packages

### @univ-lehavre/atlas-openalex

**API:** `https://api.openalex.org`

**Entities:**
- Works, Authors, Sources, Institutions, Topics, Publishers, Funders

**Operations per entity:**
- `GET /{entity}` - Paginated list with filters
- `GET /{entity}/{id}` - Entity by ID
- `GET /{entity}/random` - Random

### @univ-lehavre/atlas-crossref

**API:** `https://api.crossref.org`

**Entities:**
- Works, Funders, Members, Prefixes, Journals, Types, Licenses

**Specificity:**
- Existing OpenAPI spec to retrieve from Swagger UI
- "Polite pool" with `mailto:` header for better rate limit

### @univ-lehavre/atlas-hal

**API:** `https://api.archives-ouvertes.fr`

**Endpoints:**
- `/search/` - Solr search
- `/ref/` - Reference data (structures, authors, domains)

**Specificity:**
- Apache Solr-based API
- Formats: JSON, XML, BibTeX, CSV

### @univ-lehavre/atlas-arxiv

**API:** `http://export.arxiv.org/api`

**Endpoints:**
- `/query` - Search (returns Atom/XML)

**Specificity:**
- Responses in Atom 1.0 (XML)
- No native JSON → transformation required
- Undocumented rate limit (~1 req/3s recommended)

### @univ-lehavre/atlas-orcid

**API:** `https://pub.orcid.org/v3.0`

**Endpoints:**
- `/{orcid}` - Complete profile
- `/{orcid}/works` - Publications
- `/{orcid}/employments` - Affiliations
- `/search` - Search

**Specificity:**
- Swagger temporarily unavailable
- Formats: JSON, XML

## Type Generation

TypeScript types are generated from OpenAPI specs with `openapi-typescript`:

```bash
# Generate types for a package
pnpm -F @univ-lehavre/atlas-openalex generate:types
```

The script generates `src/client/generated/types.ts` from `specs/current.yaml`.

## Effect Client Pattern

All clients follow the same pattern:

```typescript
import { Effect, Context, Layer, Data } from 'effect';

// Service tag
export class OpenAlexClientService extends Context.Tag('OpenAlexClientService')<
  OpenAlexClientService,
  OpenAlexClient
>() {}

// Typed errors
export class OpenAlexApiError extends Data.TaggedError('OpenAlexApiError')<{
  readonly message: string;
  readonly status?: number;
}> {}

// Client interface
interface OpenAlexClient {
  getWork: (id: string) => Effect.Effect<Work, OpenAlexError>;
  listWorks: (options?: ListOptions) => Effect.Effect<ListResponse<Work>, OpenAlexError>;
  // ...
}

// Factory
export const createOpenAlexClient = (config: OpenAlexConfig): OpenAlexClient => {
  // Implementation
};

// Layer for dependency injection
export const makeOpenAlexClientLayer = (
  config: OpenAlexConfig
): Layer.Layer<OpenAlexClientService> =>
  Layer.succeed(OpenAlexClientService, createOpenAlexClient(config));
```

## Branded Types

Each package defines its branded types for compile-time validation:

```typescript
import { Brand } from 'effect';

// OpenAlex ID (e.g., W1234567890)
export type OpenAlexId = string & Brand.Brand<'OpenAlexId'>;
export const OpenAlexId = Brand.refined<OpenAlexId>(
  (id) => /^[WASITP]\d+$/.test(id),
  () => Brand.error('Invalid OpenAlex ID')
);

// DOI
export type DOI = string & Brand.Brand<'DOI'>;
export const DOI = Brand.refined<DOI>(
  (doi) => /^10\.\d{4,}\/.*$/.test(doi),
  () => Brand.error('Invalid DOI')
);

// ORCID
export type ORCID = string & Brand.Brand<'ORCID'>;
export const ORCID = Brand.refined<ORCID>(
  (orcid) => /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/.test(orcid),
  () => Brand.error('Invalid ORCID')
);
```
