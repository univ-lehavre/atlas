# Client unifié (atlas-citations)

`@univ-lehavre/atlas-citations` fournit une API unifiée pour interroger toutes les sources bibliographiques de manière transparente.

## Installation

```bash
pnpm add @univ-lehavre/atlas-citations
```

## Structure

```
packages/citations/
├── specs/
│   └── citations.yaml              # OpenAPI unifiée par entités
├── src/
│   ├── entities/                   # Schémas unifiés par entité
│   │   ├── work.ts                 # Publication/Article
│   │   ├── author.ts               # Auteur/Chercheur
│   │   ├── institution.ts          # Institution/Organisation
│   │   ├── source.ts               # Journal/Revue/Dépôt
│   │   └── funder.ts               # Financeur
│   ├── adapters/                   # Transformation source → unifié
│   │   ├── openalex-adapter.ts
│   │   ├── crossref-adapter.ts
│   │   ├── hal-adapter.ts
│   │   ├── arxiv-adapter.ts
│   │   └── orcid-adapter.ts
│   ├── resolver/                   # Résolution d'identifiants
│   │   ├── doi-resolver.ts
│   │   ├── orcid-resolver.ts
│   │   └── multi-resolver.ts
│   ├── client/
│   │   ├── client.ts               # Client unifié
│   │   └── source-selector.ts      # Sélection automatique/manuelle
│   └── server/
│       └── routes/                 # API HTTP optionnelle
```

## Entités unifiées

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
  _raw: unknown;                     // Données brutes de la source
}
```

### Author (Auteur)

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
    // hal, arxiv, orcid: configuration optionnelle
  },
  defaultSources: ['openalex', 'crossref'],  // Sources par défaut
  parallelRequests: true,                     // Interroger en parallèle
  mergeStrategy: 'enrich',                    // 'first' | 'enrich'
});
```

## API

### Recherche de publications

```typescript
// Recherche automatique (sélection intelligente des sources)
const works = yield* client.searchWorks('machine learning');

// Forcer des sources spécifiques
const halWorks = yield* client.searchWorks('deep learning', {
  sources: ['hal'],
});

// Avec pagination
const page2 = yield* client.searchWorks('neural networks', {
  page: 2,
  perPage: 50,
});
```

### Récupération d'une publication

```typescript
// Par DOI (résolu automatiquement via Crossref/OpenAlex)
const work = yield* client.getWork('10.1234/example');

// Par ID spécifique
const openalexWork = yield* client.getWork('W2741809807');
const halWork = yield* client.getWork('hal-01234567', ['hal']);
```

### Recherche d'auteurs

```typescript
// Recherche par nom
const authors = yield* client.searchAuthors('Marie Curie');

// Par ORCID
const author = yield* client.getAuthor('0000-0002-1825-0097');

// Publications d'un auteur
const authorWorks = yield* client.getAuthorWorks('0000-0002-1825-0097');
```

### Recherche d'institutions

```typescript
const institutions = yield* client.searchInstitutions('Université Le Havre');
```

### Résolution universelle

```typescript
// Détecte automatiquement le type d'identifiant
const entity = yield* client.resolve('10.1234/example');      // DOI → Work
const entity = yield* client.resolve('0000-0002-1825-0097');  // ORCID → Author
const entity = yield* client.resolve('W2741809807');          // OpenAlex → Work
```

## Sélection de source

### Automatique (par défaut)

Le client sélectionne automatiquement les sources les plus pertinentes :

```typescript
// DOI → Crossref en priorité, puis OpenAlex
client.getWork('10.1234/example');

// ORCID → ORCID puis OpenAlex
client.getAuthor('0000-0002-1825-0097');

// HAL ID → HAL uniquement
client.getWork('hal-01234567');

// ArXiv ID → ArXiv uniquement
client.getWork('2301.12345');

// Recherche textuelle → toutes les sources pertinentes
client.searchWorks('machine learning');
```

### Forcée par l'utilisateur

```typescript
// Forcer une seule source
const halWorks = yield* client.searchWorks('machine learning', {
  sources: ['hal'],
});

// Forcer plusieurs sources
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

### Santé des sources

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

## OpenAPI unifiée

Le package expose sa propre spec OpenAPI pour le serveur HTTP optionnel :

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
          description: Terme de recherche
        - name: sources
          in: query
          description: Sources à interroger
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
      description: Résoudre un identifiant vers l'entité correspondante
```

## Serveur HTTP (optionnel)

```typescript
import { createCitationsServer } from '@univ-lehavre/atlas-citations/server';

const server = createCitationsServer({
  port: 3000,
  client: createCitationsClient({ /* config */ }),
});

await server.listen();
// API disponible sur http://localhost:3000
```

Endpoints :
- `GET /works?q=...&sources=...`
- `GET /works/:id`
- `GET /authors?q=...`
- `GET /authors/:id`
- `GET /authors/:id/works`
- `GET /institutions?q=...`
- `GET /resolve/:id`
- `GET /health`
