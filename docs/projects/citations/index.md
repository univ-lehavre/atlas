# Atlas Citations

::: warning Project Under Development
Atlas Citations is currently in the design phase. The documentation below describes the target architecture. The packages are not yet implemented.
:::

Atlas Citations is a suite of packages for querying bibliographic sources via typed Effect clients, with OpenAPI specs validated against real APIs.

## What is Atlas Citations?

Atlas Citations allows you to:

- **Query** multiple bibliographic sources (OpenAlex, Crossref, HAL, ArXiv, ORCID)
- **Unify** data into a common schema
- **Verify** researcher profiles with Atlas Verify

## Documentation

### For Researchers (Atlas Verify)

If you are a researcher and want to use Atlas Verify to manage your bibliographic profile:

| Guide | Description |
|-------|-------------|
| [Introduction](./user/) | Discover Atlas Verify |
| [Verify Your Publications](./user/verify-publications.md) | Validate articles attributed to you |
| [Manage Your Career](./user/manage-career.md) | Verify your affiliations and career |
| [Expertise Profile](./user/expertise-profile.md) | Your research domains |
| [Collaboration Network](./user/collaboration-network.md) | Your co-authors and partnerships |
| [Data Sources](./user/sources.md) | Where the data comes from |

### For Developers

If you want to integrate Atlas Citations into your project or contribute to development:

| Document | Description |
|----------|-------------|
| [Technical Overview](./dev/) | Introduction for developers |
| [Architecture](./dev/architecture.md) | Package structure and Effect patterns |
| [Unified Schema](./dev/unified-schema.md) | OpenAPI specification and entity mapping |
| [Unified Client](./dev/citations-client.md) | Multi-source aggregation API |

#### OpenAPI & Validation

| Document | Description |
|----------|-------------|
| [OpenAPI Lifecycle](./dev/openapi-lifecycle.md) | Versioning alpha -> beta -> stable |
| [OpenAPI Validator](./dev/openapi-validator.md) | CLI spec validation tool |
| [Rate Limiting](./dev/rate-limiting.md) | Quota management by source |

#### Atlas Verify (Verification System)

| Document | Description |
|----------|-------------|
| [Author Verification](./dev/author-verification.md) | Data model and verification workflows |
| [Researcher Profile](./dev/researcher-profile.md) | Career reconstruction, expertise, collaborations |
| [Databases](./dev/database-analysis.md) | PostgreSQL, MongoDB analysis, etc. |
| [Advanced Databases](./dev/advanced-databases.md) | ArangoDB, vector search, multi-database federation |

#### Bibliographic Sources

| Document | Description |
|----------|-------------|
| [Overview](./dev/sources/) | Introduction to sources |
| [Complete Catalog](./dev/sources/catalog.md) | All analyzed sources |
| [Entity Reference](./dev/sources/entities-reference.md) | Entities by source |

## Global Architecture

```
+-----------------------------------------------------------------------------+
|                              ATLAS CITATIONS                                 |
+-----------------------------------------------------------------------------+
|                                                                              |
|  +-------------------------------------------------------------------------+|
|  |                      PRESENTATION LAYER                                  ||
|  |  +-------------+  +-------------+  +-------------+  +-------------+    ||
|  |  | Expert Map  |  |  Timeline   |  |  Co-author  |  |   Search    |    ||
|  |  |   (map)     |  |  (trends)   |  |   Network   |  |    UI       |    ||
|  |  +-------------+  +-------------+  +-------------+  +-------------+    ||
|  +-------------------------------------------------------------------------+|
|                                     |                                        |
|  +-------------------------------------------------------------------------+|
|  |                      FEDERATION LAYER                                    ||
|  |  +---------------------------------------------------------------------+  ||
|  |  |  FederatedQueryService (Effect)                                    |  ||
|  |  |  * Multi-database query plan                                       |  ||
|  |  |  * Parallel execution                                              |  ||
|  |  |  * Result merging                                                  |  ||
|  |  +---------------------------------------------------------------------+  ||
|  +-------------------------------------------------------------------------+|
|                                     |                                        |
|  +-------------------------------------------------------------------------+|
|  |                      STORAGE LAYER                                       ||
|  |  +-----------+  +-----------+  +-----------+  +-----------+            ||
|  |  |PostgreSQL |  | OpenSearch|  |  Qdrant   |  |TimescaleDB|            ||
|  |  | (data)    |  | (fulltext)|  | (vectors) |  | (metrics) |            ||
|  |  +-----------+  +-----------+  +-----------+  +-----------+            ||
|  +-------------------------------------------------------------------------+|
|                                     |                                        |
|  +-------------------------------------------------------------------------+|
|  |                      INGESTION LAYER                                     ||
|  |  +---------------------------------------------------------------------+  ||
|  |  |  atlas-citations (aggregator)                                      |  ||
|  |  |  +---------+ +---------+ +---------+ +---------+ +---------+     |  ||
|  |  |  |OpenAlex | |Crossref | |   HAL   | |  ArXiv  | |  ORCID  |     |  ||
|  |  |  +---------+ +---------+ +---------+ +---------+ +---------+     |  ||
|  |  +---------------------------------------------------------------------+  ||
|  +-------------------------------------------------------------------------+|
|                                                                              |
+-----------------------------------------------------------------------------+
```

## Unified Entities

The unified schema defines 5 main entities, common to all sources:

| Entity | Description | Identifiers |
|--------|-------------|--------------|
| **Work** | Publication (article, preprint, thesis) | DOI, OpenAlex ID, HAL ID, ArXiv ID |
| **Author** | Researcher/author | ORCID, OpenAlex ID, HAL ID |
| **Institution** | University, laboratory, company | ROR, OpenAlex ID, HAL ID |
| **Venue** | Journal, conference, repository | ISSN, OpenAlex ID |
| **Funder** | Funding organization | Crossref Funder ID, ROR |

> See [Unified Schema](./dev/unified-schema.md) for detailed specifications.

## Packages

```
packages/
├── openapi-validator/  # OpenAPI validation tool
├── openalex/           # OpenAlex client
├── crossref/           # Crossref client
├── hal/                # HAL client
├── arxiv/              # ArXiv client
├── orcid/              # ORCID client
└── citations/          # Unified aggregator
```

| Package | Source | Description |
|---------|--------|-------------|
| `@univ-lehavre/atlas-openapi-validator` | - | OpenAPI spec validation |
| `@univ-lehavre/atlas-openalex` | [OpenAlex](https://openalex.org) | 240M+ academic publications |
| `@univ-lehavre/atlas-crossref` | [Crossref](https://crossref.org) | DOI metadata |
| `@univ-lehavre/atlas-hal` | [HAL](https://hal.science) | French open archive |
| `@univ-lehavre/atlas-arxiv` | [ArXiv](https://arxiv.org) | Scientific preprints |
| `@univ-lehavre/atlas-orcid` | [ORCID](https://orcid.org) | Researcher identifiers |
| `@univ-lehavre/atlas-citations` | - | Multi-source aggregator |

## Quick Start

```typescript
import { createCitationsClient } from '@univ-lehavre/atlas-citations';
import { Effect } from 'effect';

const client = createCitationsClient();

// Automatic search (intelligent source selection)
const works = yield* client.searchWorks('machine learning');

// DOI resolution
const work = yield* client.getWork('10.1234/example');

// Force a specific source
const halWorks = yield* client.searchWorks('deep learning', {
  sources: ['hal'],
});
```
