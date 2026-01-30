# atlas-hal

Effect client for the [HAL](https://hal.science/) API, the French open archive for scientific publications.

## API Characteristics

| Aspect | Detail |
|--------|--------|
| Base URL | `https://api.archives-ouvertes.fr` |
| Format | JSON, XML, BibTeX, CSV |
| Auth | None |
| Rate limit | Not officially documented |
| API Versioning | Not versioned |
| Official OpenAPI | **No** - API based on Apache Solr |

## Specificity: Solr API

HAL uses Apache Solr as its search engine. The API directly exposes Solr query syntax:

```bash
# Simple search
curl "https://api.archives-ouvertes.fr/search/?q=machine+learning&wt=json"

# With Solr filters
curl "https://api.archives-ouvertes.fr/search/?q=*:*&fq=docType_s:ART&wt=json"

# Field selection
curl "https://api.archives-ouvertes.fr/search/?q=*:*&fl=halId_s,title_s,authFullName_s&wt=json"
```

## Building the Alpha Spec

### Method: Documentation + Inference

HAL has no OpenAPI spec, but has detailed documentation and a predictable API.

```bash
# 1. Create skeleton from documentation
atlas-openapi-validator scaffold \
  --name hal \
  --base-url https://api.archives-ouvertes.fr \
  --output specs/alpha/hal-2025-01.yaml

# 2. Enrich by inferring from real responses
atlas-openapi-validator infer \
  --base-url https://api.archives-ouvertes.fr \
  --endpoints /search \
  --sample-size 50 \
  --output specs/alpha/hal-2025-01.yaml

# 3. Validate and correct
atlas-openapi-validator validate specs/alpha/hal-2025-01.yaml \
  --base-url https://api.archives-ouvertes.fr \
  --output reports/hal-alpha.json
```

### Documentation Sources

- [HAL API Documentation](https://api.archives-ouvertes.fr/docs)
- [Field Reference](https://api.archives-ouvertes.fr/docs/search)
- [Document Types](https://api.archives-ouvertes.fr/docs/ref/doctype)

## Spec Structure

```yaml
openapi: '3.1.0'
info:
  title: HAL Open Archive API
  version: '2025-01'
  description: |
    HAL open archive API.
    Based on Apache Solr, exposes Solr query syntax.
  contact:
    url: https://hal.science/
  x-atlas-metadata:
    stage: alpha
    origin:
      type: documentation
      urls:
        - https://api.archives-ouvertes.fr/docs
        - https://api.archives-ouvertes.fr/docs/search
    createdAt: '2025-01-24T10:00:00Z'

servers:
  - url: https://api.archives-ouvertes.fr
    description: Production API

paths:
  /search:
    get:
      operationId: search
      summary: Search for documents
      description: |
        Main search endpoint.
        Uses Apache Solr syntax for queries.
      parameters:
        - $ref: '#/components/parameters/q'
        - $ref: '#/components/parameters/fq'
        - $ref: '#/components/parameters/fl'
        - $ref: '#/components/parameters/sort'
        - $ref: '#/components/parameters/rows'
        - $ref: '#/components/parameters/start'
        - $ref: '#/components/parameters/wt'
        - $ref: '#/components/parameters/facet'
        - $ref: '#/components/parameters/facetField'
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchResponse'

  /ref/doctype:
    get:
      operationId: listDocTypes
      summary: List document types
      responses:
        '200':
          description: Available document types
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RefResponse'

  /ref/structure:
    get:
      operationId: searchStructures
      summary: Search for structures/laboratories
      parameters:
        - $ref: '#/components/parameters/q'
        - $ref: '#/components/parameters/rows'
        - $ref: '#/components/parameters/start'
      responses:
        '200':
          description: Structure list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StructureResponse'

  /ref/author:
    get:
      operationId: searchAuthors
      summary: Search for authors
      parameters:
        - $ref: '#/components/parameters/q'
        - $ref: '#/components/parameters/rows'
        - $ref: '#/components/parameters/start'
      responses:
        '200':
          description: Author list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthorResponse'

  /ref/domain:
    get:
      operationId: listDomains
      summary: List scientific domains
      responses:
        '200':
          description: Domain tree
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DomainResponse'

components:
  parameters:
    q:
      name: q
      in: query
      required: true
      description: |
        Solr query. Examples:
        - `machine learning` : text search
        - `title_t:neural` : search in title
        - `*:*` : all documents
      schema:
        type: string
      example: 'machine learning'

    fq:
      name: fq
      in: query
      description: |
        Solr filter (filter query). Examples:
        - `docType_s:ART` : articles only
        - `publicationDateY_i:[2020 TO 2024]` : years 2020-2024
        - `authIdHal_s:pierre-dupont` : specific author
      schema:
        type: string
      example: 'docType_s:ART'

    fl:
      name: fl
      in: query
      description: |
        Fields to return (field list). Examples:
        - `halId_s,title_s` : ID and title
        - `*` : all fields
      schema:
        type: string
      example: 'halId_s,title_s,authFullName_s,abstract_s'

    sort:
      name: sort
      in: query
      description: Result sorting
      schema:
        type: string
      example: 'publicationDateY_i desc'

    rows:
      name: rows
      in: query
      description: Number of results per page
      schema:
        type: integer
        minimum: 1
        maximum: 10000
        default: 10

    start:
      name: start
      in: query
      description: Offset for pagination
      schema:
        type: integer
        minimum: 0
        default: 0

    wt:
      name: wt
      in: query
      description: Response format
      schema:
        type: string
        enum: [json, xml, bibtex, csv]
        default: json

    facet:
      name: facet
      in: query
      description: Enable facets
      schema:
        type: boolean
        default: false

    facetField:
      name: facet.field
      in: query
      description: Fields for facets
      schema:
        type: array
        items:
          type: string
      style: form
      explode: true

  schemas:
    SearchResponse:
      type: object
      properties:
        response:
          type: object
          properties:
            numFound:
              type: integer
              description: Total number of results
            start:
              type: integer
              description: Current offset
            docs:
              type: array
              items:
                $ref: '#/components/schemas/Document'
        facet_counts:
          $ref: '#/components/schemas/FacetCounts'

    Document:
      type: object
      description: HAL document
      properties:
        halId_s:
          type: string
          description: HAL identifier
          example: 'hal-01234567'
        docid:
          type: integer
          description: Internal numeric ID
        uri_s:
          type: string
          format: uri
          description: Document URI
        title_s:
          type: array
          items:
            type: string
          description: Document title(s)
        authFullName_s:
          type: array
          items:
            type: string
          description: Full author names
        authIdHal_s:
          type: array
          items:
            type: string
          description: HAL author identifiers
        authOrcid_s:
          type: array
          items:
            type: string
          description: Author ORCIDs
        abstract_s:
          type: array
          items:
            type: string
          description: Abstract(s)
        docType_s:
          type: string
          description: Document type
          enum:
            - ART    # Article
            - COMM   # Communication
            - POSTER # Poster
            - THESE  # Thesis
            - HDR    # Habilitation
            - REPORT # Report
            - BOOK   # Book
            - COUV   # Chapter
            - OTHER  # Other
        publicationDateY_i:
          type: integer
          description: Publication year
        journalTitle_s:
          type: string
          description: Journal title
        conferenceTitle_s:
          type: string
          description: Conference title
        structId_i:
          type: array
          items:
            type: integer
          description: Affiliated structure IDs
        structName_s:
          type: array
          items:
            type: string
          description: Structure names
        domain_s:
          type: array
          items:
            type: string
          description: Scientific domains
        keyword_s:
          type: array
          items:
            type: string
          description: Keywords
        openAccess_bool:
          type: boolean
          description: Open access
        fileMain_s:
          type: string
          format: uri
          description: Main file URL
        doiId_s:
          type: string
          description: Document DOI

    FacetCounts:
      type: object
      properties:
        facet_fields:
          type: object
          additionalProperties:
            type: array
            items:
              oneOf:
                - type: string
                - type: integer

    RefResponse:
      type: object
      properties:
        response:
          type: object
          properties:
            numFound:
              type: integer
            docs:
              type: array
              items:
                type: object

    StructureResponse:
      type: object
      properties:
        response:
          type: object
          properties:
            numFound:
              type: integer
            docs:
              type: array
              items:
                $ref: '#/components/schemas/Structure'

    Structure:
      type: object
      properties:
        docid:
          type: integer
        structId_i:
          type: integer
        name_s:
          type: string
        acronym_s:
          type: string
        type_s:
          type: string
          enum: [laboratory, institution, department, team, researchteam]
        parentDocid_i:
          type: array
          items:
            type: integer
        ror_s:
          type: string
          description: ROR ID

    AuthorResponse:
      type: object
      properties:
        response:
          type: object
          properties:
            numFound:
              type: integer
            docs:
              type: array
              items:
                $ref: '#/components/schemas/Author'

    Author:
      type: object
      properties:
        docid:
          type: integer
        idHal_s:
          type: string
          description: Author HAL identifier
        fullName_s:
          type: string
        firstName_s:
          type: string
        lastName_s:
          type: string
        orcidId_s:
          type: string
          nullable: true

    DomainResponse:
      type: object
      properties:
        response:
          type: object
          properties:
            numFound:
              type: integer
            docs:
              type: array
              items:
                $ref: '#/components/schemas/Domain'

    Domain:
      type: object
      properties:
        code_s:
          type: string
          example: 'info.info-ai'
        label_s:
          type: string
          example: 'Computer Science [cs]/Artificial Intelligence [cs.AI]'
        parentCode_s:
          type: string
          nullable: true
```

## Solr Syntax: Quick Guide

### Search Operators

```solr
# AND (implicit)
machine learning

# OR
machine OR learning

# Exact phrase
"machine learning"

# NOT
machine -deep
machine NOT deep

# Specific field
title_t:neural
authFullName_s:"Marie Curie"

# Range
publicationDateY_i:[2020 TO 2024]
publicationDateY_i:[2020 TO *]

# Wildcard
title_t:neur*
```

### Frequent Fields

| Field | Description | Type |
|-------|-------------|------|
| `halId_s` | HAL ID | string |
| `title_s` | Title | string[] |
| `authFullName_s` | Authors | string[] |
| `authIdHal_s` | HAL author IDs | string[] |
| `authOrcid_s` | Author ORCIDs | string[] |
| `abstract_s` | Abstract | string[] |
| `docType_s` | Document type | string |
| `publicationDateY_i` | Year | integer |
| `domain_s` | Domains | string[] |
| `structName_s` | Structures | string[] |
| `doiId_s` | DOI | string |

### Field Suffixes

- `_s` : string (exact match)
- `_t` : text (full-text search)
- `_i` : integer
- `_l` : long
- `_d` : double
- `_b` : boolean
- `_dt` : date

## Validation

```bash
# Validate against the real API
atlas-openapi-validator validate specs/alpha/hal-2025-01.yaml \
  --base-url https://api.archives-ouvertes.fr \
  --sample-size 20 \
  --output reports/hal-alpha.json

# Test different Solr queries
atlas-openapi-validator validate specs/alpha/hal-2025-01.yaml \
  --base-url https://api.archives-ouvertes.fr \
  --test-cases test/hal-queries.json
```

## Effect Client

```typescript
interface HalConfig {
  baseUrl?: string;  // Default: https://api.archives-ouvertes.fr
}

interface HalClient {
  // Main search
  search: (options: SearchOptions) => Effect.Effect<SearchResponse, HalError>;

  // Type shortcuts
  searchArticles: (query: string, options?: ListOptions) =>
    Effect.Effect<SearchResponse, HalError>;

  searchTheses: (query: string, options?: ListOptions) =>
    Effect.Effect<SearchResponse, HalError>;

  // Reference data
  listDocTypes: () => Effect.Effect<DocType[], HalError>;
  searchStructures: (query: string) => Effect.Effect<Structure[], HalError>;
  searchAuthors: (query: string) => Effect.Effect<Author[], HalError>;
  listDomains: () => Effect.Effect<Domain[], HalError>;

  // By identifier
  getByHalId: (halId: string) => Effect.Effect<Document, NotFoundError | HalError>;
  getByDoi: (doi: string) => Effect.Effect<Document, NotFoundError | HalError>;
}

interface SearchOptions {
  q: string;                    // Solr query
  fq?: string | string[];       // Filters
  fl?: string[];                // Fields to return
  sort?: string;                // Sort
  rows?: number;                // Limit
  start?: number;               // Offset
  facet?: boolean;              // Enable facets
  facetFields?: string[];       // Facet fields
}
```

## Versioning

HAL has no explicit API versioning. Specs are versioned by **date**:

```
specs/
├── alpha/
│   └── hal-2025-01.yaml
├── stable/
│   └── hal-2025-01.yaml
└── current.yaml -> stable/hal-2025-01.yaml
```
