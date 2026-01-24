# atlas-arxiv

Client Effect pour l'API [ArXiv](https://arxiv.org/), dépôt de preprints scientifiques en physique, mathématiques, informatique et domaines connexes.

## Caractéristiques de l'API

| Aspect | Détail |
|--------|--------|
| Base URL | `http://export.arxiv.org/api` |
| Format | Atom 1.0 (XML) |
| Auth | Aucune |
| Rate limit | ~1 req/3s recommandé (non documenté officiellement) |
| Versioning API | Non versionné |
| OpenAPI officielle | **Non** - API Atom/XML legacy |

## Particularité : API Atom/XML

ArXiv utilise le format Atom 1.0 (XML) pour ses réponses, pas JSON. Cela nécessite une transformation.

```bash
# Exemple de requête
curl "http://export.arxiv.org/api/query?search_query=all:machine+learning&max_results=5"
```

Réponse (extrait) :
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

## Construction de la spec alpha

### Méthode : Reverse Engineering

ArXiv n'a pas de spec OpenAPI et la documentation est minimale. La spec est construite par inférence.

```bash
# 1. Inférer le schéma depuis les réponses réelles
atlas-openapi-validator infer \
  --base-url http://export.arxiv.org/api \
  --endpoints /query \
  --response-format xml \
  --transform-to json \
  --sample-size 100 \
  --output specs/alpha/arxiv-2025-01.yaml

# 2. Enrichir manuellement avec la documentation
# https://info.arxiv.org/help/api/user-manual.html

# 3. Valider
atlas-openapi-validator validate specs/alpha/arxiv-2025-01.yaml \
  --base-url http://export.arxiv.org/api \
  --transform xml-to-json \
  --output reports/arxiv-alpha.json
```

### Sources de documentation

- [ArXiv API User Manual](https://info.arxiv.org/help/api/user-manual.html)
- [ArXiv Category Taxonomy](https://arxiv.org/category_taxonomy)
- [ArXiv Identifier Scheme](https://info.arxiv.org/help/arxiv_identifier.html)

## Structure de la spec

```yaml
openapi: '3.1.0'
info:
  title: ArXiv API
  version: '2025-01'
  description: |
    API de recherche ArXiv.
    Retourne des réponses au format Atom 1.0 (XML).
    Cette spec décrit la transformation JSON effectuée par le client.
  contact:
    url: https://arxiv.org/
  x-atlas-metadata:
    stage: alpha
    origin:
      type: reverse_engineered
      documentation: https://info.arxiv.org/help/api/user-manual.html
    createdAt: '2025-01-24T10:00:00Z'
    notes:
      - API native en XML Atom, transformée en JSON par le client
      - Rate limit non officiel ~1 req/3s

servers:
  - url: http://export.arxiv.org/api
    description: Production API (HTTP, pas HTTPS)

paths:
  /query:
    get:
      operationId: query
      summary: Rechercher des articles
      description: |
        Endpoint unique de recherche ArXiv.
        Retourne un flux Atom 1.0 transformé en JSON.
      parameters:
        - $ref: '#/components/parameters/search_query'
        - $ref: '#/components/parameters/id_list'
        - $ref: '#/components/parameters/start'
        - $ref: '#/components/parameters/max_results'
        - $ref: '#/components/parameters/sortBy'
        - $ref: '#/components/parameters/sortOrder'
      responses:
        '200':
          description: Résultats de recherche
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QueryResponse'
            application/atom+xml:
              schema:
                type: string
                description: Flux Atom 1.0 brut

components:
  parameters:
    search_query:
      name: search_query
      in: query
      description: |
        Requête de recherche. Syntaxe :
        - `all:term` : tous les champs
        - `ti:term` : titre
        - `au:term` : auteur
        - `abs:term` : résumé
        - `co:term` : commentaire
        - `jr:term` : journal ref
        - `cat:term` : catégorie
        - `rn:term` : report number

        Opérateurs : AND, OR, ANDNOT, parenthèses
      schema:
        type: string
      example: 'cat:cs.AI AND ti:transformer'

    id_list:
      name: id_list
      in: query
      description: |
        Liste d'IDs ArXiv séparés par des virgules.
        Alternative à search_query pour récupérer des articles spécifiques.
      schema:
        type: string
      example: '2301.12345,2301.12346'

    start:
      name: start
      in: query
      description: Index de début pour pagination (0-indexed)
      schema:
        type: integer
        minimum: 0
        default: 0

    max_results:
      name: max_results
      in: query
      description: Nombre maximum de résultats (max 2000)
      schema:
        type: integer
        minimum: 1
        maximum: 2000
        default: 10

    sortBy:
      name: sortBy
      in: query
      description: Champ de tri
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
      description: Ordre de tri
      schema:
        type: string
        enum:
          - ascending
          - descending
        default: descending

  schemas:
    QueryResponse:
      type: object
      description: Réponse transformée depuis Atom vers JSON
      properties:
        feed:
          type: object
          properties:
            title:
              type: string
              description: Description de la requête
            id:
              type: string
              format: uri
            updated:
              type: string
              format: date-time
            totalResults:
              type: integer
              description: Nombre total de résultats
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
      description: Article ArXiv
      properties:
        id:
          type: string
          format: uri
          description: URI de l'article (http://arxiv.org/abs/XXXX.XXXXX)
          example: 'http://arxiv.org/abs/2301.12345v1'
        arxivId:
          type: string
          description: ID ArXiv extrait (XXXX.XXXXX ou archive/XXXXXXX)
          example: '2301.12345'
        version:
          type: integer
          description: Version du preprint
          example: 1
        updated:
          type: string
          format: date-time
          description: Date de dernière mise à jour
        published:
          type: string
          format: date-time
          description: Date de première soumission
        title:
          type: string
          description: Titre de l'article
        summary:
          type: string
          description: Résumé (abstract)
        authors:
          type: array
          items:
            $ref: '#/components/schemas/Author'
        categories:
          type: array
          items:
            type: string
          description: Catégories ArXiv
          example: ['cs.AI', 'cs.CL', 'cs.LG']
        primaryCategory:
          type: string
          description: Catégorie principale
          example: 'cs.AI'
        comment:
          type: string
          nullable: true
          description: Commentaire (pages, figures, etc.)
          example: '15 pages, 5 figures'
        journalRef:
          type: string
          nullable: true
          description: Référence journal si publié
        doi:
          type: string
          nullable: true
          description: DOI si disponible
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
          description: Nom complet
        affiliation:
          type: string
          nullable: true
          description: Affiliation (si disponible)

    Link:
      type: object
      properties:
        href:
          type: string
          format: uri
        rel:
          type: string
          description: Type de lien
          enum:
            - alternate  # Page HTML
            - related    # DOI ou autre
        type:
          type: string
          description: MIME type
          example: 'application/pdf'
        title:
          type: string
          nullable: true
          description: Titre du lien (ex: 'pdf')
```

## Syntaxe de recherche

### Préfixes de champs

| Préfixe | Description | Exemple |
|---------|-------------|---------|
| `all:` | Tous les champs | `all:quantum computing` |
| `ti:` | Titre | `ti:transformer` |
| `au:` | Auteur | `au:hinton` |
| `abs:` | Résumé | `abs:neural network` |
| `co:` | Commentaire | `co:accepted ICML` |
| `jr:` | Journal ref | `jr:Nature` |
| `cat:` | Catégorie | `cat:cs.AI` |
| `rn:` | Report number | `rn:MIT-TR-123` |

### Opérateurs

```
# ET (AND)
ti:machine AND ti:learning

# OU (OR)
cat:cs.AI OR cat:cs.LG

# NOT (ANDNOT)
ti:transformer ANDNOT ti:vision

# Groupement
(cat:cs.AI OR cat:cs.LG) AND au:bengio

# Phrase exacte
ti:"attention is all you need"
```

### Catégories principales

| Catégorie | Domaine |
|-----------|---------|
| `cs.*` | Computer Science |
| `math.*` | Mathematics |
| `physics.*` | Physics |
| `stat.*` | Statistics |
| `q-bio.*` | Quantitative Biology |
| `q-fin.*` | Quantitative Finance |
| `econ.*` | Economics |
| `eess.*` | Electrical Engineering |

Sous-catégories CS fréquentes :
- `cs.AI` - Artificial Intelligence
- `cs.CL` - Computation and Language (NLP)
- `cs.CV` - Computer Vision
- `cs.LG` - Machine Learning
- `cs.NE` - Neural and Evolutionary Computing

## Transformation Atom → JSON

Le client atlas-arxiv transforme automatiquement les réponses Atom en JSON :

```typescript
// src/client/atom-parser.ts

interface AtomToJsonTransformer {
  // Parse le flux Atom XML
  parse: (atomXml: string) => Effect.Effect<QueryResponse, ParseError>;

  // Extrait l'ID ArXiv depuis l'URI
  extractArxivId: (uri: string) => string;
  // "http://arxiv.org/abs/2301.12345v1" → "2301.12345"

  // Extrait la version
  extractVersion: (uri: string) => number;
  // "http://arxiv.org/abs/2301.12345v2" → 2
}
```

## Rate Limiting

ArXiv n'a pas de rate limit documenté officiellement, mais recommande ~1 requête toutes les 3 secondes.

```typescript
// Stratégie conservative
const arxivRateLimiter = {
  minInterval: 3000,  // 3 secondes entre requêtes
  maxRetries: 3,
  backoffFactor: 2,
};
```

## Client Effect

```typescript
interface ArxivConfig {
  baseUrl?: string;           // Default: http://export.arxiv.org/api
  rateLimitMs?: number;       // Default: 3000
}

interface ArxivClient {
  // Recherche
  query: (options: QueryOptions) => Effect.Effect<QueryResponse, ArxivError>;

  // Par ID
  getById: (arxivId: string) => Effect.Effect<Entry, NotFoundError | ArxivError>;
  getByIds: (arxivIds: string[]) => Effect.Effect<Entry[], ArxivError>;

  // Raccourcis par catégorie
  searchCategory: (category: string, query?: string, options?: ListOptions) =>
    Effect.Effect<QueryResponse, ArxivError>;

  // Dernières soumissions
  getRecent: (category: string, maxResults?: number) =>
    Effect.Effect<QueryResponse, ArxivError>;
}

interface QueryOptions {
  searchQuery?: string;       // Requête de recherche
  idList?: string[];          // OU liste d'IDs
  start?: number;             // Offset
  maxResults?: number;        // Limite (max 2000)
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
  sortOrder?: 'ascending' | 'descending';
}
```

## Validation

```bash
# Valider avec transformation XML→JSON
atlas-openapi-validator validate specs/alpha/arxiv-2025-01.yaml \
  --base-url http://export.arxiv.org/api \
  --transform atom-to-json \
  --rate-limit 3000 \
  --sample-size 20 \
  --output reports/arxiv-alpha.json
```

## Versioning

ArXiv n'a pas de versioning d'API. Les specs sont versionnées par **date** :

```
specs/
├── alpha/
│   └── arxiv-2025-01.yaml
├── stable/
│   └── arxiv-2025-01.yaml
└── current.yaml → stable/arxiv-2025-01.yaml
```

## Notes importantes

1. **HTTP, pas HTTPS** : L'API ArXiv utilise HTTP (pas HTTPS) pour `export.arxiv.org`
2. **Rate limiting** : Respecter 3 secondes entre requêtes ou risquer un ban IP
3. **Pagination** : Maximum 2000 résultats par requête, utiliser `start` pour paginer
4. **Versions** : Les articles ont des versions (v1, v2...), l'ID peut inclure la version
