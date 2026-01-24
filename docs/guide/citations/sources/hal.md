# atlas-hal

Client Effect pour l'API [HAL](https://hal.science/), l'archive ouverte française des publications scientifiques.

## Caractéristiques de l'API

| Aspect | Détail |
|--------|--------|
| Base URL | `https://api.archives-ouvertes.fr` |
| Format | JSON, XML, BibTeX, CSV |
| Auth | Aucune |
| Rate limit | Non documenté officiellement |
| Versioning API | Non versionné |
| OpenAPI officielle | **Non** - API basée sur Apache Solr |

## Particularité : API Solr

HAL utilise Apache Solr comme moteur de recherche. L'API expose directement la syntaxe Solr :

```bash
# Recherche simple
curl "https://api.archives-ouvertes.fr/search/?q=machine+learning&wt=json"

# Avec filtres Solr
curl "https://api.archives-ouvertes.fr/search/?q=*:*&fq=docType_s:ART&wt=json"

# Sélection de champs
curl "https://api.archives-ouvertes.fr/search/?q=*:*&fl=halId_s,title_s,authFullName_s&wt=json"
```

## Construction de la spec alpha

### Méthode : Documentation + Inférence

HAL n'a pas de spec OpenAPI, mais dispose d'une documentation détaillée et d'une API prévisible.

```bash
# 1. Créer le squelette depuis la documentation
atlas-openapi-validator scaffold \
  --name hal \
  --base-url https://api.archives-ouvertes.fr \
  --output specs/alpha/hal-2025-01.yaml

# 2. Enrichir par inférence des réponses réelles
atlas-openapi-validator infer \
  --base-url https://api.archives-ouvertes.fr \
  --endpoints /search \
  --sample-size 50 \
  --output specs/alpha/hal-2025-01.yaml

# 3. Valider et corriger
atlas-openapi-validator validate specs/alpha/hal-2025-01.yaml \
  --base-url https://api.archives-ouvertes.fr \
  --output reports/hal-alpha.json
```

### Sources de documentation

- [Documentation API HAL](https://api.archives-ouvertes.fr/docs)
- [Référentiel des champs](https://api.archives-ouvertes.fr/docs/search)
- [Types de documents](https://api.archives-ouvertes.fr/docs/ref/doctype)

## Structure de la spec

```yaml
openapi: '3.1.0'
info:
  title: HAL Open Archive API
  version: '2025-01'
  description: |
    API de l'archive ouverte HAL.
    Basée sur Apache Solr, expose une syntaxe de requête Solr.
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
      summary: Rechercher des documents
      description: |
        Endpoint principal de recherche.
        Utilise la syntaxe Apache Solr pour les requêtes.
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
          description: Résultats de recherche
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchResponse'

  /ref/doctype:
    get:
      operationId: listDocTypes
      summary: Liste des types de documents
      responses:
        '200':
          description: Types de documents disponibles
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RefResponse'

  /ref/structure:
    get:
      operationId: searchStructures
      summary: Rechercher des structures/laboratoires
      parameters:
        - $ref: '#/components/parameters/q'
        - $ref: '#/components/parameters/rows'
        - $ref: '#/components/parameters/start'
      responses:
        '200':
          description: Liste des structures
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StructureResponse'

  /ref/author:
    get:
      operationId: searchAuthors
      summary: Rechercher des auteurs
      parameters:
        - $ref: '#/components/parameters/q'
        - $ref: '#/components/parameters/rows'
        - $ref: '#/components/parameters/start'
      responses:
        '200':
          description: Liste des auteurs
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthorResponse'

  /ref/domain:
    get:
      operationId: listDomains
      summary: Liste des domaines scientifiques
      responses:
        '200':
          description: Arborescence des domaines
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
        Requête Solr. Exemples :
        - `machine learning` : recherche textuelle
        - `title_t:neural` : recherche dans le titre
        - `*:*` : tous les documents
      schema:
        type: string
      example: 'machine learning'

    fq:
      name: fq
      in: query
      description: |
        Filtre Solr (filter query). Exemples :
        - `docType_s:ART` : articles uniquement
        - `publicationDateY_i:[2020 TO 2024]` : années 2020-2024
        - `authIdHal_s:pierre-dupont` : auteur spécifique
      schema:
        type: string
      example: 'docType_s:ART'

    fl:
      name: fl
      in: query
      description: |
        Champs à retourner (field list). Exemples :
        - `halId_s,title_s` : ID et titre
        - `*` : tous les champs
      schema:
        type: string
      example: 'halId_s,title_s,authFullName_s,abstract_s'

    sort:
      name: sort
      in: query
      description: Tri des résultats
      schema:
        type: string
      example: 'publicationDateY_i desc'

    rows:
      name: rows
      in: query
      description: Nombre de résultats par page
      schema:
        type: integer
        minimum: 1
        maximum: 10000
        default: 10

    start:
      name: start
      in: query
      description: Offset pour pagination
      schema:
        type: integer
        minimum: 0
        default: 0

    wt:
      name: wt
      in: query
      description: Format de réponse
      schema:
        type: string
        enum: [json, xml, bibtex, csv]
        default: json

    facet:
      name: facet
      in: query
      description: Activer les facettes
      schema:
        type: boolean
        default: false

    facetField:
      name: facet.field
      in: query
      description: Champs pour facettes
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
              description: Nombre total de résultats
            start:
              type: integer
              description: Offset actuel
            docs:
              type: array
              items:
                $ref: '#/components/schemas/Document'
        facet_counts:
          $ref: '#/components/schemas/FacetCounts'

    Document:
      type: object
      description: Document HAL
      properties:
        halId_s:
          type: string
          description: Identifiant HAL
          example: 'hal-01234567'
        docid:
          type: integer
          description: ID numérique interne
        uri_s:
          type: string
          format: uri
          description: URI du document
        title_s:
          type: array
          items:
            type: string
          description: Titre(s) du document
        authFullName_s:
          type: array
          items:
            type: string
          description: Noms complets des auteurs
        authIdHal_s:
          type: array
          items:
            type: string
          description: Identifiants HAL des auteurs
        authOrcid_s:
          type: array
          items:
            type: string
          description: ORCID des auteurs
        abstract_s:
          type: array
          items:
            type: string
          description: Résumé(s)
        docType_s:
          type: string
          description: Type de document
          enum:
            - ART    # Article
            - COMM   # Communication
            - POSTER # Poster
            - THESE  # Thèse
            - HDR    # HDR
            - REPORT # Rapport
            - BOOK   # Ouvrage
            - COUV   # Chapitre
            - OTHER  # Autre
        publicationDateY_i:
          type: integer
          description: Année de publication
        journalTitle_s:
          type: string
          description: Titre du journal
        conferenceTitle_s:
          type: string
          description: Titre de la conférence
        structId_i:
          type: array
          items:
            type: integer
          description: IDs des structures affiliées
        structName_s:
          type: array
          items:
            type: string
          description: Noms des structures
        domain_s:
          type: array
          items:
            type: string
          description: Domaines scientifiques
        keyword_s:
          type: array
          items:
            type: string
          description: Mots-clés
        openAccess_bool:
          type: boolean
          description: Accès ouvert
        fileMain_s:
          type: string
          format: uri
          description: URL du fichier principal
        doiId_s:
          type: string
          description: DOI du document

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
          description: Identifiant HAL de l'auteur
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

## Syntaxe Solr : Guide rapide

### Opérateurs de recherche

```solr
# ET (AND implicite)
machine learning

# OU
machine OR learning

# Phrase exacte
"machine learning"

# NOT
machine -deep
machine NOT deep

# Champ spécifique
title_t:neural
authFullName_s:"Marie Curie"

# Range
publicationDateY_i:[2020 TO 2024]
publicationDateY_i:[2020 TO *]

# Wildcard
title_t:neur*
```

### Champs fréquents

| Champ | Description | Type |
|-------|-------------|------|
| `halId_s` | ID HAL | string |
| `title_s` | Titre | string[] |
| `authFullName_s` | Auteurs | string[] |
| `authIdHal_s` | ID HAL auteurs | string[] |
| `authOrcid_s` | ORCID auteurs | string[] |
| `abstract_s` | Résumé | string[] |
| `docType_s` | Type document | string |
| `publicationDateY_i` | Année | integer |
| `domain_s` | Domaines | string[] |
| `structName_s` | Structures | string[] |
| `doiId_s` | DOI | string |

### Suffixes de champs

- `_s` : string (exact match)
- `_t` : text (full-text search)
- `_i` : integer
- `_l` : long
- `_d` : double
- `_b` : boolean
- `_dt` : date

## Validation

```bash
# Valider contre l'API réelle
atlas-openapi-validator validate specs/alpha/hal-2025-01.yaml \
  --base-url https://api.archives-ouvertes.fr \
  --sample-size 20 \
  --output reports/hal-alpha.json

# Tester différentes requêtes Solr
atlas-openapi-validator validate specs/alpha/hal-2025-01.yaml \
  --base-url https://api.archives-ouvertes.fr \
  --test-cases test/hal-queries.json
```

## Client Effect

```typescript
interface HalConfig {
  baseUrl?: string;  // Default: https://api.archives-ouvertes.fr
}

interface HalClient {
  // Recherche principale
  search: (options: SearchOptions) => Effect.Effect<SearchResponse, HalError>;

  // Raccourcis par type
  searchArticles: (query: string, options?: ListOptions) =>
    Effect.Effect<SearchResponse, HalError>;

  searchTheses: (query: string, options?: ListOptions) =>
    Effect.Effect<SearchResponse, HalError>;

  // Référentiels
  listDocTypes: () => Effect.Effect<DocType[], HalError>;
  searchStructures: (query: string) => Effect.Effect<Structure[], HalError>;
  searchAuthors: (query: string) => Effect.Effect<Author[], HalError>;
  listDomains: () => Effect.Effect<Domain[], HalError>;

  // Par identifiant
  getByHalId: (halId: string) => Effect.Effect<Document, NotFoundError | HalError>;
  getByDoi: (doi: string) => Effect.Effect<Document, NotFoundError | HalError>;
}

interface SearchOptions {
  q: string;                    // Requête Solr
  fq?: string | string[];       // Filtres
  fl?: string[];                // Champs à retourner
  sort?: string;                // Tri
  rows?: number;                // Limite
  start?: number;               // Offset
  facet?: boolean;              // Activer facettes
  facetFields?: string[];       // Champs facettes
}
```

## Versioning

HAL n'a pas de versioning d'API explicite. Les specs sont versionnées par **date** :

```
specs/
├── alpha/
│   └── hal-2025-01.yaml
├── stable/
│   └── hal-2025-01.yaml
└── current.yaml → stable/hal-2025-01.yaml
```
