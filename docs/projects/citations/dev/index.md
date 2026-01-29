# Documentation technique

Cette section contient la documentation technique d'Atlas Citations destinée aux développeurs.

## Vue d'ensemble

Atlas Citations est une suite de packages TypeScript/Effect pour interroger des sources bibliographiques via des clients typés, avec des specs OpenAPI validées contre les APIs réelles.

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

## Architecture

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Structure des packages et patterns Effect |
| [Schéma unifié](./unified-schema.md) | Spécification OpenAPI et mapping des entités |
| [Client unifié](./citations-client.md) | API d'agrégation multi-sources |

## OpenAPI & Validation

| Document | Description |
|----------|-------------|
| [Cycle de vie OpenAPI](./openapi-lifecycle.md) | Versioning alpha → beta → stable |
| [Validateur OpenAPI](./openapi-validator.md) | Outil CLI de validation des specs |
| [Rate Limiting](./rate-limiting.md) | Gestion des quotas par source |

## Sources bibliographiques

| Document | Description |
|----------|-------------|
| [Vue d'ensemble](./sources/) | Introduction aux sources |
| [Catalogue complet](./sources/catalog.md) | Toutes les sources analysées |
| [Référence entités](./sources/entities-reference.md) | Entités par source |
| [OpenAlex](./sources/openalex.md) | Client et spec OpenAlex |
| [Crossref](./sources/crossref.md) | Client et spec Crossref |
| [HAL](./sources/hal.md) | Client et spec HAL |
| [ArXiv](./sources/arxiv.md) | Client et spec ArXiv |
| [ORCID](./sources/orcid.md) | Client et spec ORCID |
| [Versioning](./sources/versioning.md) | Gestion des versions par source |

## Atlas Verify (système de fiabilisation)

| Document | Description |
|----------|-------------|
| [Vérification auteur](./author-verification.md) | Modèle de données et workflows |
| [Profil chercheur](./researcher-profile.md) | Algorithmes de reconstruction carrière/expertise |
| [Bases de données](./database-analysis.md) | Analyse PostgreSQL, MongoDB, etc. |
| [Bases avancées](./advanced-databases.md) | ArangoDB, vector search, fédération multi-bases |

## Stack technique

| Technologie | Usage |
|-------------|-------|
| **TypeScript 5.x** | Langage principal |
| **Effect** | Gestion d'effets et erreurs |
| **openapi-typescript** | Génération de types depuis OpenAPI |
| **Vitest** | Tests unitaires |
| **tsup** | Build des packages |

## Liens vers documentation utilisateur

Pour la documentation destinée aux chercheurs (utilisateurs finaux), voir :

- [Guide utilisateur Atlas Verify](../user/) - Documentation pour les chercheurs
