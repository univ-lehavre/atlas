# Atlas Citations

Atlas Citations est une suite de packages pour interroger des sources bibliographiques via des clients Effect typés, avec des specs OpenAPI validées contre les APIs réelles.

## Qu'est-ce qu'Atlas Citations ?

Atlas Citations permet de :

- **Interroger** plusieurs sources bibliographiques (OpenAlex, Crossref, HAL, ArXiv, ORCID)
- **Unifier** les données dans un schéma commun
- **Fiabiliser** les profils chercheurs avec Atlas Verify

## Documentation

### Pour les chercheurs (Atlas Verify)

Si vous êtes chercheur et souhaitez utiliser Atlas Verify pour gérer votre profil bibliographique :

| Guide | Description |
|-------|-------------|
| [Introduction](./user/) | Découvrir Atlas Verify |
| [Vérifier vos publications](./user/verify-publications.md) | Valider les articles qui vous sont attribués |
| [Gérer votre parcours](./user/manage-career.md) | Vérifier vos affiliations et votre carrière |
| [Profil d'expertise](./user/expertise-profile.md) | Vos domaines de recherche |
| [Réseau de collaborations](./user/collaboration-network.md) | Vos co-auteurs et partenariats |
| [Les sources de données](./user/sources.md) | D'où viennent les données |

### Pour les développeurs

Si vous souhaitez intégrer Atlas Citations dans votre projet ou contribuer au développement :

| Document | Description |
|----------|-------------|
| [Vue d'ensemble technique](./dev/) | Introduction pour développeurs |
| [Architecture](./dev/architecture.md) | Structure des packages et patterns Effect |
| [Schéma unifié](./dev/unified-schema.md) | Spécification OpenAPI et mapping des entités |
| [Client unifié](./dev/citations-client.md) | API d'agrégation multi-sources |

#### OpenAPI & Validation

| Document | Description |
|----------|-------------|
| [Cycle de vie OpenAPI](./dev/openapi-lifecycle.md) | Versioning alpha → beta → stable |
| [Validateur OpenAPI](./dev/openapi-validator.md) | Outil CLI de validation des specs |
| [Rate Limiting](./dev/rate-limiting.md) | Gestion des quotas par source |

#### Atlas Verify (système de fiabilisation)

| Document | Description |
|----------|-------------|
| [Fiabilisation auteur](./dev/author-verification.md) | Modèle de données et workflows de vérification |
| [Profil chercheur](./dev/researcher-profile.md) | Reconstruction carrière, expertises, collaborations |
| [Bases de données](./dev/database-analysis.md) | Analyse PostgreSQL, MongoDB, etc. |
| [Bases avancées](./dev/advanced-databases.md) | ArangoDB, vector search, fédération multi-bases |

#### Sources bibliographiques

| Document | Description |
|----------|-------------|
| [Vue d'ensemble](./dev/sources/) | Introduction aux sources |
| [Catalogue complet](./dev/sources/catalog.md) | Toutes les sources analysées |
| [Référence entités](./dev/sources/entities-reference.md) | Entités par source |

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

> Voir [Schéma unifié](./dev/unified-schema.md) pour les spécifications détaillées.

## Packages

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
