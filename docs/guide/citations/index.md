# Atlas Citations

Atlas Citations est une suite de packages pour interroger des sources bibliographiques via des clients Effect typés, avec des specs OpenAPI validées contre les APIs réelles.

## Vue d'ensemble

```
packages/
├── openapi-validator/  # Outil de validation OpenAPI
├── openalex/           # Client OpenAlex
├── crossref/           # Client Crossref
├── hal/                # Client HAL
├── arxiv/              # Client ArXiv
├── orcid/              # Client ORCID
└── citations/          # Agrégateur unifié
```

## Principes

1. **Un package par source** : Chaque source bibliographique a son propre package avec sa spec OpenAPI
2. **OpenAPI-first** : Les types TypeScript sont générés depuis les specs OpenAPI
3. **Validation continue** : Les specs sont testées contre les APIs réelles
4. **Rate limiting natif** : Gestion des quotas et retry automatique
5. **API unifiée** : `atlas-citations` agrège toutes les sources de manière transparente

## Packages

| Package | Source | Description |
|---------|--------|-------------|
| `@univ-lehavre/atlas-openapi-validator` | - | Validation des specs OpenAPI |
| `@univ-lehavre/atlas-openalex` | [OpenAlex](https://openalex.org) | 240M+ publications académiques |
| `@univ-lehavre/atlas-crossref` | [Crossref](https://crossref.org) | Métadonnées DOI |
| `@univ-lehavre/atlas-hal` | [HAL](https://hal.science) | Archive ouverte française |
| `@univ-lehavre/atlas-arxiv` | [ArXiv](https://arxiv.org) | Prépublications scientifiques |
| `@univ-lehavre/atlas-orcid` | [ORCID](https://orcid.org) | Identifiants chercheurs |
| `@univ-lehavre/atlas-citations` | - | Agrégateur multi-sources |

## Utilisation rapide

```typescript
import { createCitationsClient } from '@univ-lehavre/atlas-citations';
import { Effect } from 'effect';

const client = createCitationsClient();

// Recherche automatique (sélection intelligente des sources)
const works = yield* client.searchWorks('machine learning');

// Résolution d'un DOI
const work = yield* client.getWork('10.1234/example');

// Forcer une source spécifique
const halWorks = yield* client.searchWorks('deep learning', {
  sources: ['hal'],
});
```

## Sommaire

- [Architecture](./architecture.md) - Structure des packages et patterns
- [Cycle de vie OpenAPI](./openapi-lifecycle.md) - Versioning et validation des specs
- [Rate Limiting](./rate-limiting.md) - Gestion des quotas par source
- [Validateur OpenAPI](./openapi-validator.md) - Outil de validation des specs
- [Client unifié](./citations-client.md) - Agrégateur multi-sources
