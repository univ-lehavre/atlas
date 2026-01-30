# Technical Documentation

This section contains the technical documentation for Atlas Citations intended for developers.

## Overview

Atlas Citations is a suite of TypeScript/Effect packages for querying bibliographic sources via typed clients, with OpenAPI specs validated against real APIs.

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

## Architecture

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Package structure and Effect patterns |
| [Unified Schema](./unified-schema.md) | OpenAPI specification and entity mapping |
| [Unified Client](./citations-client.md) | Multi-source aggregation API |

## OpenAPI & Validation

| Document | Description |
|----------|-------------|
| [OpenAPI Lifecycle](./openapi-lifecycle.md) | Versioning alpha -> beta -> stable |
| [OpenAPI Validator](./openapi-validator.md) | CLI spec validation tool |
| [Rate Limiting](./rate-limiting.md) | Quota management by source |

## Bibliographic Sources

| Document | Description |
|----------|-------------|
| [Overview](./sources/) | Introduction to sources |
| [Complete Catalog](./sources/catalog.md) | All analyzed sources |
| [Entity Reference](./sources/entities-reference.md) | Entities by source |
| [OpenAlex](./sources/openalex.md) | OpenAlex client and spec |
| [Crossref](./sources/crossref.md) | Crossref client and spec |
| [HAL](./sources/hal.md) | HAL client and spec |
| [ArXiv](./sources/arxiv.md) | ArXiv client and spec |
| [ORCID](./sources/orcid.md) | ORCID client and spec |
| [Versioning](./sources/versioning.md) | Version management by source |

## Atlas Verify (Verification System)

| Document | Description |
|----------|-------------|
| [Author Verification](./author-verification.md) | Data model and workflows |
| [Researcher Profile](./researcher-profile.md) | Career/expertise reconstruction algorithms |
| [Databases](./database-analysis.md) | PostgreSQL, MongoDB analysis, etc. |
| [Advanced Databases](./advanced-databases.md) | ArangoDB, vector search, multi-database federation |

## Technical Stack

| Technology | Usage |
|------------|-------|
| **TypeScript 5.x** | Primary language |
| **Effect** | Effect and error management |
| **openapi-typescript** | Type generation from OpenAPI |
| **Vitest** | Unit tests |
| **tsup** | Package builds |

## Links to User Documentation

For documentation intended for researchers (end users), see:

- [Atlas Verify User Guide](../user/) - Documentation for researchers
