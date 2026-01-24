# Architecture

Ce document décrit la structure des packages atlas-* et les patterns d'implémentation.

> **Voir aussi :**
> - [Vue d'ensemble](./index.md) - Introduction à Atlas Citations
> - [Cycle de vie OpenAPI](./openapi-lifecycle.md) - Processus alpha → beta → stable
> - [Schéma unifié](./unified-schema.md) - Entités et spécification OpenAPI

## Structure d'un package atlas-*

Chaque package source suit la même structure :

```
packages/{source}/
├── specs/
│   ├── alpha/                      # Specs en cours de création
│   ├── beta/                       # Specs en validation
│   ├── stable/                     # Specs validées
│   │   └── {source}-{version}.yaml
│   └── current.yaml                # Symlink → stable/{latest}
├── src/
│   ├── client/
│   │   ├── generated/types.ts      # Types générés (openapi-typescript)
│   │   ├── brands.ts               # Branded types spécifiques
│   │   ├── client.ts               # Client Effect
│   │   ├── errors.ts               # Erreurs typées + RateLimitError
│   │   ├── rate-limit.ts           # Gestion quotas et retry
│   │   ├── types.ts                # Interfaces
│   │   └── index.ts
│   ├── cli/
│   │   └── index.ts                # CLI test connectivité
│   ├── bin/
│   │   └── atlas-{source}.ts       # Entry point
│   └── index.ts
├── test/
│   ├── client.test.ts              # Tests unitaires
│   └── api.test.ts                 # Tests contre API réelle
├── package.json
└── tsconfig.json
```

## État des specs OpenAPI par source

| Source | OpenAPI officielle | Action |
|--------|-------------------|--------|
| **OpenAlex** | Non | Créer from scratch |
| **Crossref** | [Swagger UI](https://api.crossref.org/swagger-ui) | Récupérer et adapter |
| **HAL** | Non (API Solr) | Créer from scratch |
| **ArXiv** | Non (API Atom/XML) | Créer from scratch |
| **ORCID** | Indisponible temporairement | Créer from scratch |

## Packages détaillés

### @univ-lehavre/atlas-openalex

**API:** `https://api.openalex.org`

**Entités:**
- Works, Authors, Sources, Institutions, Topics, Publishers, Funders

**Opérations par entité:**
- `GET /{entity}` - Liste paginée avec filtres
- `GET /{entity}/{id}` - Entité par ID
- `GET /{entity}/random` - Aléatoire

### @univ-lehavre/atlas-crossref

**API:** `https://api.crossref.org`

**Entités:**
- Works, Funders, Members, Prefixes, Journals, Types, Licenses

**Spécificité:**
- Spec OpenAPI existante à récupérer depuis Swagger UI
- "Polite pool" avec header `mailto:` pour meilleur rate limit

### @univ-lehavre/atlas-hal

**API:** `https://api.archives-ouvertes.fr`

**Endpoints:**
- `/search/` - Recherche Solr
- `/ref/` - Référentiels (structures, auteurs, domaines)

**Spécificité:**
- API basée sur Apache Solr
- Formats: JSON, XML, BibTeX, CSV

### @univ-lehavre/atlas-arxiv

**API:** `http://export.arxiv.org/api`

**Endpoints:**
- `/query` - Recherche (retourne Atom/XML)

**Spécificité:**
- Réponses en Atom 1.0 (XML)
- Pas de JSON natif → transformation nécessaire
- Rate limit non documenté (~1 req/3s recommandé)

### @univ-lehavre/atlas-orcid

**API:** `https://pub.orcid.org/v3.0`

**Endpoints:**
- `/{orcid}` - Profil complet
- `/{orcid}/works` - Publications
- `/{orcid}/employments` - Affiliations
- `/search` - Recherche

**Spécificité:**
- Swagger temporairement indisponible
- Formats: JSON, XML

## Génération des types

Les types TypeScript sont générés depuis les specs OpenAPI avec `openapi-typescript` :

```bash
# Générer les types pour un package
pnpm -F @univ-lehavre/atlas-openalex generate:types
```

Le script génère `src/client/generated/types.ts` depuis `specs/current.yaml`.

## Pattern client Effect

Tous les clients suivent le même pattern :

```typescript
import { Effect, Context, Layer, Data } from 'effect';

// Service tag
export class OpenAlexClientService extends Context.Tag('OpenAlexClientService')<
  OpenAlexClientService,
  OpenAlexClient
>() {}

// Erreurs typées
export class OpenAlexApiError extends Data.TaggedError('OpenAlexApiError')<{
  readonly message: string;
  readonly status?: number;
}> {}

// Interface client
interface OpenAlexClient {
  getWork: (id: string) => Effect.Effect<Work, OpenAlexError>;
  listWorks: (options?: ListOptions) => Effect.Effect<ListResponse<Work>, OpenAlexError>;
  // ...
}

// Factory
export const createOpenAlexClient = (config: OpenAlexConfig): OpenAlexClient => {
  // Implementation
};

// Layer pour injection de dépendances
export const makeOpenAlexClientLayer = (
  config: OpenAlexConfig
): Layer.Layer<OpenAlexClientService> =>
  Layer.succeed(OpenAlexClientService, createOpenAlexClient(config));
```

## Branded types

Chaque package définit ses branded types pour la validation à la compilation :

```typescript
import { Brand } from 'effect';

// OpenAlex ID (ex: W1234567890)
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
