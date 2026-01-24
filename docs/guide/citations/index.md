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

## Documentation

### Fondamentaux

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Structure des packages et patterns Effect |
| [Schéma unifié](./unified-schema.md) | Spécification OpenAPI et mapping des entités |
| [Client unifié](./citations-client.md) | API d'agrégation multi-sources |

### OpenAPI & Validation

| Document | Description |
|----------|-------------|
| [Cycle de vie OpenAPI](./openapi-lifecycle.md) | Versioning alpha → beta → stable |
| [Validateur OpenAPI](./openapi-validator.md) | Outil CLI de validation des specs |
| [Rate Limiting](./rate-limiting.md) | Gestion des quotas par source |

### Sources bibliographiques

| Document | Description |
|----------|-------------|
| [Vue d'ensemble](./sources/index.md) | Introduction aux sources |
| [Catalogue complet](./sources/catalog.md) | Toutes les sources analysées |
| [Référence entités](./sources/entities-reference.md) | Entités par source |
| [OpenAlex](./sources/openalex.md) | Client et spec OpenAlex |
| [Crossref](./sources/crossref.md) | Client et spec Crossref |
| [HAL](./sources/hal.md) | Client et spec HAL |
| [ArXiv](./sources/arxiv.md) | Client et spec ArXiv |
| [ORCID](./sources/orcid.md) | Client et spec ORCID |
| [Versioning](./sources/versioning.md) | Gestion des versions par source |

### Atlas Verify (Fiabilisation)

| Document | Description |
|----------|-------------|
| [Fiabilisation auteur](./author-verification.md) | Modèle de données et workflows de vérification |
| [Bases de données](./database-analysis.md) | Analyse PostgreSQL, MongoDB, etc. |
| [Bases avancées & Recherche](./advanced-databases.md) | ArangoDB, vector search, fédération multi-bases |

## Architecture globale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ATLAS CITATIONS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      COUCHE PRÉSENTATION                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    ││
│  │  │ Expert Map  │  │  Timeline   │  │  Co-author  │  │   Search    │    ││
│  │  │   (carte)   │  │  (trends)   │  │   Network   │  │    UI       │    ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                     │                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      COUCHE FÉDÉRATION                                   ││
│  │  ┌───────────────────────────────────────────────────────────────────┐  ││
│  │  │  FederatedQueryService (Effect)                                    │  ││
│  │  │  • Plan de requête multi-bases                                     │  ││
│  │  │  • Exécution parallèle                                             │  ││
│  │  │  • Fusion des résultats                                            │  ││
│  │  └───────────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                     │                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      COUCHE STOCKAGE                                     ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐            ││
│  │  │PostgreSQL │  │ OpenSearch│  │  Qdrant   │  │TimescaleDB│            ││
│  │  │ (données) │  │ (fulltext)│  │ (vectors) │  │ (metrics) │            ││
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                     │                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      COUCHE INGESTION                                    ││
│  │  ┌───────────────────────────────────────────────────────────────────┐  ││
│  │  │  atlas-citations (agrégateur)                                      │  ││
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │  ││
│  │  │  │OpenAlex │ │Crossref │ │   HAL   │ │  ArXiv  │ │  ORCID  │     │  ││
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │  ││
│  │  └───────────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Entités unifiées

Le schéma unifié définit 5 entités principales, communes à toutes les sources :

| Entité | Description | Identifiants |
|--------|-------------|--------------|
| **Work** | Publication (article, preprint, thèse) | DOI, OpenAlex ID, HAL ID, ArXiv ID |
| **Author** | Chercheur/auteur | ORCID, OpenAlex ID, HAL ID |
| **Institution** | Université, laboratoire, entreprise | ROR, OpenAlex ID, HAL ID |
| **Venue** | Journal, conférence, dépôt | ISSN, OpenAlex ID |
| **Funder** | Organisme financeur | Crossref Funder ID, ROR |

> Voir [Schéma unifié](./unified-schema.md) pour les spécifications détaillées et le mapping complet.
