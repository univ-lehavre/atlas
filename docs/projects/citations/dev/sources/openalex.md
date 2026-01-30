# atlas-openalex

Effect client for the [OpenAlex](https://openalex.org) API, an open catalog of 240M+ academic publications.

## API Characteristics

| Aspect | Detail |
|--------|--------|
| Base URL | `https://api.openalex.org` |
| Format | JSON |
| Auth | Optional API key (recommended) |
| Rate limit | 100k req/day (with API key) |
| API Versioning | Not versioned (continuous evolution) |
| Official OpenAPI | No |

## Building the Alpha Spec

### Source: Official Documentation

The OpenAlex documentation is complete and structured:
- https://docs.openalex.org/api-entities/works
- https://docs.openalex.org/api-entities/authors
- https://docs.openalex.org/how-to-use-the-api

### Process

```bash
# 1. Create skeleton from documentation structure
atlas-openapi-validator scaffold \
  --name openalex \
  --version "$(date +%Y-%m-%d)" \
  --base-url https://api.openalex.org \
  --output specs/alpha/openalex-2025-01-24.yaml

# 2. Add entities one by one
# Start with Works (the most complex)
```

### Spec Structure

```yaml
openapi: '3.1.0'
info:
  title: OpenAlex API
  version: '2025-01-24'
  description: |
    OpenAlex is a fully open catalog of the global research system.
    This spec is built from the official documentation.
  contact:
    url: https://openalex.org
  x-atlas-metadata:
    stage: alpha
    origin:
      type: documentation
      urls:
        - https://docs.openalex.org/api-entities/works/work-object
        - https://docs.openalex.org/api-entities/authors/author-object
        - https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities
    createdAt: '2025-01-24T10:00:00Z'
    lastValidatedAt: null

servers:
  - url: https://api.openalex.org
    description: Production API

paths:
  # ══════════════════════════════════════════════════════════════════════════
  # WORKS
  # ══════════════════════════════════════════════════════════════════════════
  /works:
    get:
      operationId: listWorks
      summary: Get a list of works
      tags: [works]
      parameters:
        - $ref: '#/components/parameters/filter'
        - $ref: '#/components/parameters/search'
        - $ref: '#/components/parameters/sort'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
        - $ref: '#/components/parameters/cursor'
        - $ref: '#/components/parameters/select'
        - $ref: '#/components/parameters/groupBy'
        - $ref: '#/components/parameters/sample'
      responses:
        '200':
          description: List of works
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksResponse'
        '429':
          $ref: '#/components/responses/RateLimitError'

  /works/{id}:
    get:
      operationId: getWork
      summary: Get a single work
      tags: [works]
      parameters:
        - name: id
          in: path
          required: true
          description: OpenAlex ID (W...), DOI, or other supported ID
          schema:
            type: string
          examples:
            openalex_id:
              value: W2741809807
            doi:
              value: https://doi.org/10.1038/nature12373
        - $ref: '#/components/parameters/select'
      responses:
        '200':
          description: Work details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Work'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /works/random:
    get:
      operationId: getRandomWork
      summary: Get a random work
      tags: [works]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Work'

  # ... /authors, /sources, /institutions, /topics, /publishers, /funders

components:
  parameters:
    filter:
      name: filter
      in: query
      description: |
        Filter results. Syntax: attribute:value,attribute2:value2
        Operators: > < ! | (OR within attribute)
      schema:
        type: string
      examples:
        by_year:
          value: publication_year:2023
        by_oa:
          value: is_oa:true
        combined:
          value: publication_year:>2020,is_oa:true

    search:
      name: search
      in: query
      description: Full-text search across title and abstract
      schema:
        type: string

    sort:
      name: sort
      in: query
      description: Sort order. Syntax: field:asc or field:desc
      schema:
        type: string
      examples:
        by_citations:
          value: cited_by_count:desc
        by_date:
          value: publication_date:desc

    page:
      name: page
      in: query
      description: Page number (1-indexed, max 10000 results with basic paging)
      schema:
        type: integer
        minimum: 1
        default: 1

    perPage:
      name: per_page
      in: query
      description: Results per page
      schema:
        type: integer
        minimum: 1
        maximum: 200
        default: 25

    cursor:
      name: cursor
      in: query
      description: |
        Cursor for deep pagination. Use * to start, then use next_cursor from response.
        Required for accessing beyond 10,000 results.
      schema:
        type: string

    select:
      name: select
      in: query
      description: Comma-separated list of fields to return
      schema:
        type: string

    groupBy:
      name: group_by
      in: query
      description: Group and count results by a field
      schema:
        type: string

    sample:
      name: sample
      in: query
      description: Return a random sample of N results
      schema:
        type: integer

  schemas:
    Work:
      type: object
      required:
        - id
        - display_name
        - type
        - cited_by_count
        - is_paratext
        - is_retracted
        - created_date
        - updated_date
      properties:
        id:
          type: string
          description: OpenAlex ID
          example: https://openalex.org/W2741809807
        doi:
          type: string
          nullable: true
          description: DOI URL
        title:
          type: string
          nullable: true
        display_name:
          type: string
        type:
          type: string
          enum:
            - article
            - book-chapter
            - book
            - dataset
            - dissertation
            - editorial
            - erratum
            - letter
            - other
            - paratext
            - peer-review
            - preprint
            - reference-entry
            - report
            - review
            - standard
        publication_date:
          type: string
          format: date
          nullable: true
        publication_year:
          type: integer
          nullable: true
        cited_by_count:
          type: integer
        is_oa:
          type: boolean
        is_paratext:
          type: boolean
        is_retracted:
          type: boolean
        authorships:
          type: array
          items:
            $ref: '#/components/schemas/Authorship'
        primary_location:
          $ref: '#/components/schemas/Location'
          nullable: true
        locations:
          type: array
          items:
            $ref: '#/components/schemas/Location'
        best_oa_location:
          $ref: '#/components/schemas/Location'
          nullable: true
        open_access:
          $ref: '#/components/schemas/OpenAccess'
        abstract_inverted_index:
          type: object
          nullable: true
          additionalProperties:
            type: array
            items:
              type: integer
        cited_by_api_url:
          type: string
          format: uri
        counts_by_year:
          type: array
          items:
            $ref: '#/components/schemas/YearCount'
        created_date:
          type: string
          format: date
        updated_date:
          type: string
          format: date-time
        # ... other fields

    Authorship:
      type: object
      properties:
        author_position:
          type: string
          enum: [first, middle, last]
        author:
          $ref: '#/components/schemas/DehydratedAuthor'
        institutions:
          type: array
          items:
            $ref: '#/components/schemas/DehydratedInstitution'
        is_corresponding:
          type: boolean
        raw_affiliation_strings:
          type: array
          items:
            type: string

    # ... other schemas

  responses:
    RateLimitError:
      description: Rate limit exceeded
      headers:
        X-Rate-Limit-Limit:
          schema:
            type: integer
        X-Rate-Limit-Remaining:
          schema:
            type: integer
        Retry-After:
          schema:
            type: integer
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              message:
                type: string

    NotFoundError:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              message:
                type: string
```

## Entities to Document

| Entity | Endpoint | Complexity | Priority |
|--------|----------|------------|----------|
| Works | `/works` | High (50+ fields) | 1 |
| Authors | `/authors` | Medium | 2 |
| Sources | `/sources` | Medium | 3 |
| Institutions | `/institutions` | Medium | 4 |
| Topics | `/topics` | Low | 5 |
| Publishers | `/publishers` | Low | 6 |
| Funders | `/funders` | Low | 7 |

## Validation

```bash
# Validate against the real API
atlas-openapi-validator validate specs/alpha/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --sample-size 10 \
  --respect-rate-limits \
  --output reports/openalex-alpha.json

# Points of vigilance
# - Undocumented nullable fields
# - Actual vs documented types (e.g., string vs integer)
# - Deprecated fields (x_concepts)
# - New undocumented fields
```

## Effect Client

```typescript
import { Effect, Context, Data } from 'effect';

// Configuration
interface OpenAlexConfig {
  apiKey?: string;
  userAgent?: string;
}

// Errors
export class OpenAlexApiError extends Data.TaggedError('OpenAlexApiError')<{
  readonly message: string;
  readonly status?: number;
}> {}

export class OpenAlexRateLimitError extends Data.TaggedError('OpenAlexRateLimitError')<{
  readonly retryAfter: number;
  readonly remaining: number;
  readonly limit: number;
}> {}

// Client interface
interface OpenAlexClient {
  // Works
  listWorks: (options?: ListOptions) => Effect.Effect<WorksResponse, OpenAlexError>;
  getWork: (id: string) => Effect.Effect<Work, OpenAlexError>;
  searchWorks: (query: string, options?: ListOptions) => Effect.Effect<WorksResponse, OpenAlexError>;

  // Authors
  listAuthors: (options?: ListOptions) => Effect.Effect<AuthorsResponse, OpenAlexError>;
  getAuthor: (id: string) => Effect.Effect<Author, OpenAlexError>;

  // ... other entities

  // Rate limiting
  getRateLimitStatus: () => Effect.Effect<RateLimitStatus, never>;
}
```

## Versioning

OpenAlex has no explicit API versioning. Specs are versioned by **date snapshot**:

```
specs/
├── alpha/
│   └── openalex-2025-01-24.yaml
├── beta/
│   └── openalex-2025-01-24.yaml
├── stable/
│   ├── openalex-2024-06-15.yaml
│   └── openalex-2025-01-24.yaml
└── current.yaml -> stable/openalex-2025-01-24.yaml
```

When a new API version introduces breaking changes:
1. Create a new alpha spec with the current date
2. Validate and promote
3. Update `current.yaml`
4. Keep old versions for backward compatibility
