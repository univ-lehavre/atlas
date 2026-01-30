# atlas-arxiv

Effect client for the [ArXiv](https://arxiv.org/) API, a preprint repository for scientific papers in physics, mathematics, computer science, and related fields.

## API Characteristics

| Aspect | Detail |
|--------|--------|
| Base URL | `http://export.arxiv.org/api` |
| Format | Atom 1.0 (XML) |
| Auth | None |
| Rate limit | ~1 req/3s recommended (not officially documented) |
| API Versioning | Not versioned |
| Official OpenAPI | **No** - Legacy Atom/XML API |

## Specificity: Atom/XML API

ArXiv uses the Atom 1.0 format (XML) for its responses, not JSON. This requires transformation.

```bash
# Example request
curl "http://export.arxiv.org/api/query?search_query=all:machine+learning&max_results=5"
```

Response (excerpt):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ArXiv Query: all:machine learning</title>
  <opensearch:totalResults>500000</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/2301.12345v1</id>
    <title>Deep Learning for Natural Language Processing</title>
    <published>2023-01-15T00:00:00Z</published>
    <author><name>John Doe</name></author>
    <summary>We present a novel approach...</summary>
    <arxiv:primary_category term="cs.CL"/>
    <category term="cs.AI"/>
  </entry>
</feed>
```

## Building the Alpha Spec

### Method: Reverse Engineering

ArXiv has no OpenAPI spec and documentation is minimal. The spec is built through inference.

```bash
# 1. Infer the schema from real responses
atlas-openapi-validator infer \
  --base-url http://export.arxiv.org/api \
  --endpoints /query \
  --response-format xml \
  --transform-to json \
  --sample-size 100 \
  --output specs/alpha/arxiv-2025-01.yaml

# 2. Manually enrich with documentation
# https://info.arxiv.org/help/api/user-manual.html

# 3. Validate
atlas-openapi-validator validate specs/alpha/arxiv-2025-01.yaml \
  --base-url http://export.arxiv.org/api \
  --transform xml-to-json \
  --output reports/arxiv-alpha.json
```

### Documentation Sources

- [ArXiv API User Manual](https://info.arxiv.org/help/api/user-manual.html)
- [ArXiv Category Taxonomy](https://arxiv.org/category_taxonomy)
- [ArXiv Identifier Scheme](https://info.arxiv.org/help/arxiv_identifier.html)

## Spec Structure

```yaml
openapi: '3.1.0'
info:
  title: ArXiv API
  version: '2025-01'
  description: |
    ArXiv search API.
    Returns responses in Atom 1.0 (XML) format.
    This spec describes the JSON transformation performed by the client.
  contact:
    url: https://arxiv.org/
  x-atlas-metadata:
    stage: alpha
    origin:
      type: reverse_engineered
      documentation: https://info.arxiv.org/help/api/user-manual.html
    createdAt: '2025-01-24T10:00:00Z'
    notes:
      - Native XML Atom API, transformed to JSON by the client
      - Unofficial rate limit ~1 req/3s

servers:
  - url: http://export.arxiv.org/api
    description: Production API (HTTP, not HTTPS)

paths:
  /query:
    get:
      operationId: query
      summary: Search for articles
      description: |
        Unique ArXiv search endpoint.
        Returns an Atom 1.0 feed transformed to JSON.
      parameters:
        - $ref: '#/components/parameters/search_query'
        - $ref: '#/components/parameters/id_list'
        - $ref: '#/components/parameters/start'
        - $ref: '#/components/parameters/max_results'
        - $ref: '#/components/parameters/sortBy'
        - $ref: '#/components/parameters/sortOrder'
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QueryResponse'
            application/atom+xml:
              schema:
                type: string
                description: Raw Atom 1.0 feed

components:
  parameters:
    search_query:
      name: search_query
      in: query
      description: |
        Search query. Syntax:
        - `all:term` : all fields
        - `ti:term` : title
        - `au:term` : author
        - `abs:term` : abstract
        - `co:term` : comment
        - `jr:term` : journal ref
        - `cat:term` : category
        - `rn:term` : report number

        Operators: AND, OR, ANDNOT, parentheses
      schema:
        type: string
      example: 'cat:cs.AI AND ti:transformer'

    id_list:
      name: id_list
      in: query
      description: |
        Comma-separated list of ArXiv IDs.
        Alternative to search_query for retrieving specific articles.
      schema:
        type: string
      example: '2301.12345,2301.12346'

    start:
      name: start
      in: query
      description: Start index for pagination (0-indexed)
      schema:
        type: integer
        minimum: 0
        default: 0

    max_results:
      name: max_results
      in: query
      description: Maximum number of results (max 2000)
      schema:
        type: integer
        minimum: 1
        maximum: 2000
        default: 10

    sortBy:
      name: sortBy
      in: query
      description: Sort field
      schema:
        type: string
        enum:
          - relevance
          - lastUpdatedDate
          - submittedDate
        default: relevance

    sortOrder:
      name: sortOrder
      in: query
      description: Sort order
      schema:
        type: string
        enum:
          - ascending
          - descending
        default: descending

  schemas:
    QueryResponse:
      type: object
      description: Response transformed from Atom to JSON
      properties:
        feed:
          type: object
          properties:
            title:
              type: string
              description: Query description
            id:
              type: string
              format: uri
            updated:
              type: string
              format: date-time
            totalResults:
              type: integer
              description: Total number of results
            startIndex:
              type: integer
            itemsPerPage:
              type: integer
            entries:
              type: array
              items:
                $ref: '#/components/schemas/Entry'

    Entry:
      type: object
      description: ArXiv article
      properties:
        id:
          type: string
          format: uri
          description: Article URI (http://arxiv.org/abs/XXXX.XXXXX)
          example: 'http://arxiv.org/abs/2301.12345v1'
        arxivId:
          type: string
          description: Extracted ArXiv ID (XXXX.XXXXX or archive/XXXXXXX)
          example: '2301.12345'
        version:
          type: integer
          description: Preprint version
          example: 1
        updated:
          type: string
          format: date-time
          description: Last update date
        published:
          type: string
          format: date-time
          description: First submission date
        title:
          type: string
          description: Article title
        summary:
          type: string
          description: Abstract
        authors:
          type: array
          items:
            $ref: '#/components/schemas/Author'
        categories:
          type: array
          items:
            type: string
          description: ArXiv categories
          example: ['cs.AI', 'cs.CL', 'cs.LG']
        primaryCategory:
          type: string
          description: Primary category
          example: 'cs.AI'
        comment:
          type: string
          nullable: true
          description: Comment (pages, figures, etc.)
          example: '15 pages, 5 figures'
        journalRef:
          type: string
          nullable: true
          description: Journal reference if published
        doi:
          type: string
          nullable: true
          description: DOI if available
          example: '10.1234/example'
        links:
          type: array
          items:
            $ref: '#/components/schemas/Link'

    Author:
      type: object
      properties:
        name:
          type: string
          description: Full name
        affiliation:
          type: string
          nullable: true
          description: Affiliation (if available)

    Link:
      type: object
      properties:
        href:
          type: string
          format: uri
        rel:
          type: string
          description: Link type
          enum:
            - alternate  # HTML page
            - related    # DOI or other
        type:
          type: string
          description: MIME type
          example: 'application/pdf'
        title:
          type: string
          nullable: true
          description: Link title (e.g., 'pdf')
```

## Search Syntax

### Field Prefixes

| Prefix | Description | Example |
|---------|-------------|---------|
| `all:` | All fields | `all:quantum computing` |
| `ti:` | Title | `ti:transformer` |
| `au:` | Author | `au:hinton` |
| `abs:` | Abstract | `abs:neural network` |
| `co:` | Comment | `co:accepted ICML` |
| `jr:` | Journal ref | `jr:Nature` |
| `cat:` | Category | `cat:cs.AI` |
| `rn:` | Report number | `rn:MIT-TR-123` |

### Operators

```
# AND
ti:machine AND ti:learning

# OR
cat:cs.AI OR cat:cs.LG

# NOT (ANDNOT)
ti:transformer ANDNOT ti:vision

# Grouping
(cat:cs.AI OR cat:cs.LG) AND au:bengio

# Exact phrase
ti:"attention is all you need"
```

### Main Categories

| Category | Domain |
|-----------|---------|
| `cs.*` | Computer Science |
| `math.*` | Mathematics |
| `physics.*` | Physics |
| `stat.*` | Statistics |
| `q-bio.*` | Quantitative Biology |
| `q-fin.*` | Quantitative Finance |
| `econ.*` | Economics |
| `eess.*` | Electrical Engineering |

Frequent CS subcategories:
- `cs.AI` - Artificial Intelligence
- `cs.CL` - Computation and Language (NLP)
- `cs.CV` - Computer Vision
- `cs.LG` - Machine Learning
- `cs.NE` - Neural and Evolutionary Computing

## Atom to JSON Transformation

The atlas-arxiv client automatically transforms Atom responses to JSON:

```typescript
// src/client/atom-parser.ts

interface AtomToJsonTransformer {
  // Parse the Atom XML feed
  parse: (atomXml: string) => Effect.Effect<QueryResponse, ParseError>;

  // Extract ArXiv ID from URI
  extractArxivId: (uri: string) => string;
  // "http://arxiv.org/abs/2301.12345v1" -> "2301.12345"

  // Extract version
  extractVersion: (uri: string) => number;
  // "http://arxiv.org/abs/2301.12345v2" -> 2
}
```

## Rate Limiting

ArXiv has no officially documented rate limit, but recommends ~1 request every 3 seconds.

```typescript
// Conservative strategy
const arxivRateLimiter = {
  minInterval: 3000,  // 3 seconds between requests
  maxRetries: 3,
  backoffFactor: 2,
};
```

## Effect Client

```typescript
interface ArxivConfig {
  baseUrl?: string;           // Default: http://export.arxiv.org/api
  rateLimitMs?: number;       // Default: 3000
}

interface ArxivClient {
  // Search
  query: (options: QueryOptions) => Effect.Effect<QueryResponse, ArxivError>;

  // By ID
  getById: (arxivId: string) => Effect.Effect<Entry, NotFoundError | ArxivError>;
  getByIds: (arxivIds: string[]) => Effect.Effect<Entry[], ArxivError>;

  // Category shortcuts
  searchCategory: (category: string, query?: string, options?: ListOptions) =>
    Effect.Effect<QueryResponse, ArxivError>;

  // Recent submissions
  getRecent: (category: string, maxResults?: number) =>
    Effect.Effect<QueryResponse, ArxivError>;
}

interface QueryOptions {
  searchQuery?: string;       // Search query
  idList?: string[];          // OR list of IDs
  start?: number;             // Offset
  maxResults?: number;        // Limit (max 2000)
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
  sortOrder?: 'ascending' | 'descending';
}
```

## Validation

```bash
# Validate with XML to JSON transformation
atlas-openapi-validator validate specs/alpha/arxiv-2025-01.yaml \
  --base-url http://export.arxiv.org/api \
  --transform atom-to-json \
  --rate-limit 3000 \
  --sample-size 20 \
  --output reports/arxiv-alpha.json
```

## Versioning

ArXiv has no API versioning. Specs are versioned by **date**:

```
specs/
├── alpha/
│   └── arxiv-2025-01.yaml
├── stable/
│   └── arxiv-2025-01.yaml
└── current.yaml -> stable/arxiv-2025-01.yaml
```

## Important Notes

1. **HTTP, not HTTPS**: The ArXiv API uses HTTP (not HTTPS) for `export.arxiv.org`
2. **Rate limiting**: Respect 3 seconds between requests or risk IP ban
3. **Pagination**: Maximum 2000 results per request, use `start` to paginate
4. **Versions**: Articles have versions (v1, v2...), the ID can include the version
