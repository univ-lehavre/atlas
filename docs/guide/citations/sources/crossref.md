# atlas-crossref

Client Effect pour l'API [Crossref](https://www.crossref.org/), registre officiel des métadonnées DOI.

## Caractéristiques de l'API

| Aspect | Détail |
|--------|--------|
| Base URL | `https://api.crossref.org` |
| Format | JSON |
| Auth | Aucune (email recommandé pour "polite pool") |
| Rate limit | 50 req/s (polite pool), moins sans email |
| Versioning API | Non versionné |
| OpenAPI officielle | **Oui** - [Swagger UI](https://api.crossref.org/swagger-ui) |

## Construction de la spec alpha

### Source : Swagger officiel

Crossref fournit une spec OpenAPI officielle accessible via Swagger UI.

```bash
# Télécharger la spec officielle
atlas-openapi-validator fetch https://api.crossref.org/swagger.json \
  --output specs/alpha/crossref-v1-2025-01.yaml \
  --format yaml \
  --set-stage alpha \
  --add-metadata
```

### Adaptations nécessaires

La spec officielle nécessite quelques adaptations :

```bash
# 1. Récupérer la spec brute
curl -o specs/alpha/crossref-raw.json https://api.crossref.org/swagger.json

# 2. Convertir et adapter
atlas-openapi-validator transform specs/alpha/crossref-raw.json \
  --output specs/alpha/crossref-v1-2025-01.yaml \
  --format yaml \
  --fix-nullable \
  --add-rate-limit-headers \
  --set-stage alpha
```

### Adaptations typiques

```yaml
# Ajouter les métadonnées atlas
info:
  x-atlas-metadata:
    stage: alpha
    origin:
      type: official_swagger
      url: https://api.crossref.org/swagger.json
      fetchedAt: '2025-01-24T10:00:00Z'
    createdAt: '2025-01-24T10:00:00Z'

# Ajouter les headers de rate limit (souvent manquants)
components:
  responses:
    WorksResponse:
      headers:
        X-Rate-Limit-Limit:
          description: Requests allowed per interval
          schema:
            type: integer
        X-Rate-Limit-Interval:
          description: Rate limit interval (e.g., "1s")
          schema:
            type: string

# Corriger les types nullable
components:
  schemas:
    Work:
      properties:
        abstract:
          type: string
          nullable: true  # Souvent manquant dans la spec officielle
```

## Structure de la spec adaptée

```yaml
openapi: '3.1.0'
info:
  title: Crossref REST API
  version: '2025-01'
  description: |
    Crossref metadata API.
    Adapted from official Swagger spec with rate limit headers.
  contact:
    url: https://www.crossref.org/
  x-atlas-metadata:
    stage: alpha
    origin:
      type: official_swagger
      url: https://api.crossref.org/swagger.json
      fetchedAt: '2025-01-24T10:00:00Z'

servers:
  - url: https://api.crossref.org
    description: Production API

paths:
  /works:
    get:
      operationId: listWorks
      summary: Search works
      parameters:
        - $ref: '#/components/parameters/query'
        - $ref: '#/components/parameters/filter'
        - $ref: '#/components/parameters/rows'
        - $ref: '#/components/parameters/offset'
        - $ref: '#/components/parameters/sort'
        - $ref: '#/components/parameters/order'
        - $ref: '#/components/parameters/facet'
        - $ref: '#/components/parameters/select'
        - $ref: '#/components/parameters/mailto'
      responses:
        '200':
          description: Works list
          headers:
            X-Rate-Limit-Limit:
              $ref: '#/components/headers/X-Rate-Limit-Limit'
            X-Rate-Limit-Interval:
              $ref: '#/components/headers/X-Rate-Limit-Interval'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksMessage'

  /works/{doi}:
    get:
      operationId: getWork
      summary: Get work by DOI
      parameters:
        - name: doi
          in: path
          required: true
          description: DOI (without https://doi.org/ prefix)
          schema:
            type: string
          example: 10.1038/nature12373
        - $ref: '#/components/parameters/mailto'
      responses:
        '200':
          description: Work details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkMessage'
        '404':
          description: DOI not found

  /funders:
    get:
      operationId: listFunders
      # ...

  /funders/{id}:
    get:
      operationId: getFunder
      # ...

  /members:
    get:
      operationId: listMembers
      # ...

  /journals:
    get:
      operationId: listJournals
      # ...

  /types:
    get:
      operationId: listTypes
      # ...

  /licenses:
    get:
      operationId: listLicenses
      # ...

components:
  parameters:
    query:
      name: query
      in: query
      description: Free-text query
      schema:
        type: string

    filter:
      name: filter
      in: query
      description: |
        Filter results. Multiple filters separated by comma.
        Examples: has-abstract:true, from-pub-date:2020
      schema:
        type: string

    rows:
      name: rows
      in: query
      description: Number of results (max 1000)
      schema:
        type: integer
        minimum: 1
        maximum: 1000
        default: 20

    offset:
      name: offset
      in: query
      description: Offset for pagination
      schema:
        type: integer
        minimum: 0

    sort:
      name: sort
      in: query
      description: Sort field
      schema:
        type: string
        enum:
          - score
          - relevance
          - updated
          - deposited
          - indexed
          - published
          - issued
          - is-referenced-by-count
          - references-count

    order:
      name: order
      in: query
      description: Sort order
      schema:
        type: string
        enum: [asc, desc]
        default: desc

    mailto:
      name: mailto
      in: query
      description: |
        Email address for "polite pool" access.
        Provides better rate limits and priority.
      schema:
        type: string
        format: email

    select:
      name: select
      in: query
      description: Comma-separated list of fields to return
      schema:
        type: string

    facet:
      name: facet
      in: query
      description: Facet field(s) for aggregation
      schema:
        type: string

  headers:
    X-Rate-Limit-Limit:
      description: Number of requests allowed per interval
      schema:
        type: integer

    X-Rate-Limit-Interval:
      description: Rate limit interval
      schema:
        type: string
      example: "1s"

  schemas:
    WorksMessage:
      type: object
      properties:
        status:
          type: string
        message-type:
          type: string
          enum: [work-list]
        message-version:
          type: string
        message:
          type: object
          properties:
            total-results:
              type: integer
            items-per-page:
              type: integer
            query:
              type: object
            items:
              type: array
              items:
                $ref: '#/components/schemas/Work'

    Work:
      type: object
      properties:
        DOI:
          type: string
        type:
          type: string
        title:
          type: array
          items:
            type: string
        author:
          type: array
          items:
            $ref: '#/components/schemas/Author'
        container-title:
          type: array
          items:
            type: string
        published:
          $ref: '#/components/schemas/DateParts'
        issued:
          $ref: '#/components/schemas/DateParts'
        abstract:
          type: string
          nullable: true
        is-referenced-by-count:
          type: integer
        references-count:
          type: integer
        URL:
          type: string
          format: uri
        license:
          type: array
          items:
            $ref: '#/components/schemas/License'
        funder:
          type: array
          items:
            $ref: '#/components/schemas/Funder'
        # ... autres champs

    Author:
      type: object
      properties:
        given:
          type: string
        family:
          type: string
        ORCID:
          type: string
          nullable: true
        affiliation:
          type: array
          items:
            type: object
            properties:
              name:
                type: string

    DateParts:
      type: object
      properties:
        date-parts:
          type: array
          items:
            type: array
            items:
              type: integer
```

## Polite Pool

Crossref offre un meilleur rate limit si vous incluez votre email :

```typescript
const client = createCrossrefClient({
  mailto: 'your-email@institution.edu',
});
```

**Avantages du polite pool :**
- Rate limit augmenté
- Priorité dans la file d'attente
- Notifications en cas de problème avec vos requêtes

## Validation

```bash
# Comparer notre spec adaptée avec la spec officielle
atlas-openapi-validator diff \
  specs/alpha/crossref-raw.json \
  specs/alpha/crossref-v1-2025-01.yaml \
  --output reports/crossref-adaptations.json

# Valider contre l'API réelle
atlas-openapi-validator validate specs/alpha/crossref-v1-2025-01.yaml \
  --base-url https://api.crossref.org \
  --headers "mailto=test@example.com" \
  --sample-size 10 \
  --output reports/crossref-alpha.json
```

## Client Effect

```typescript
interface CrossrefConfig {
  mailto?: string;  // Recommandé pour polite pool
}

interface CrossrefClient {
  // Works
  listWorks: (options?: ListOptions) => Effect.Effect<WorksMessage, CrossrefError>;
  getWork: (doi: string) => Effect.Effect<Work, CrossrefError>;
  searchWorks: (query: string, options?: ListOptions) => Effect.Effect<WorksMessage, CrossrefError>;

  // Funders
  listFunders: (options?: ListOptions) => Effect.Effect<FundersMessage, CrossrefError>;
  getFunder: (id: string) => Effect.Effect<Funder, CrossrefError>;

  // Journals
  listJournals: (options?: ListOptions) => Effect.Effect<JournalsMessage, CrossrefError>;
  getJournal: (issn: string) => Effect.Effect<Journal, CrossrefError>;

  // Rate limiting
  getRateLimitStatus: () => Effect.Effect<RateLimitStatus, never>;
}
```

## Versioning

Crossref n'a pas de versioning d'API explicite. Les specs sont versionnées par **date + version API implicite** :

```
specs/
├── alpha/
│   └── crossref-v1-2025-01.yaml
├── stable/
│   └── crossref-v1-2025-01.yaml
└── current.yaml → stable/crossref-v1-2025-01.yaml
```

Le préfixe `v1` indique la version majeure de l'API Crossref (actuellement stable depuis des années).
