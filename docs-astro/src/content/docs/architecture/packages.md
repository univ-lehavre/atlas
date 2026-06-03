---
title: Carte des paquets
---

Cette page liste **tous les paquets du monorepo** : leur rôle, leur catégorie,
et leurs dépendances internes — qui consomme quoi. Elle répond à la question
« pour comprendre un paquet, lesquels dois-je lire ? ».

> **Page générée.** Le contenu ci-dessous est dérivé des `package.json` par
> `scripts/docs/generate-packages-map.mjs`. Ne l'éditez pas à la main : lancez
> `pnpm docs:generate` après un changement de dépendances. La fraîcheur est
> vérifiée en CI (plan « Documentation vérifiable »).

Pour la vue d'ensemble par catégorie et les règles transverses, voir
[la structure du monorepo](./monorepo).

<!-- AUTO-GENERATED:packages-map START -->

### Applications (`apps/`)

| Paquet                                                        | Rôle                                                                                                   | Dépend de                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Consommé par |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| [`atlas-amarre`](../../apps/amarre/README.md)                 | Application de gestion des conventions.                                                                | [`atlas-auth`](../../packages/auth/README.md), [`atlas-baas`](../../packages/baas/README.md), [`atlas-errors`](../../packages/errors/README.md), [`atlas-logos-cli`](../../cli/logos/README.md), [`atlas-shared-config`](../../config/shared-config/README.md), [`atlas-sveltekit-csp`](../../packages/sveltekit-csp/README.md), [`atlas-sveltekit-handler`](../../packages/sveltekit-handler/README.md), `atlas-test-utils-sveltekit`, [`atlas-ui`](../../ui/atlas-ui/README.md), [`atlas-validators`](../../packages/validators/README.md)                         | —            |
| [`atlas-crf-dashboard`](../../apps/crf-dashboard/README.md)   | Tableau de bord interne — vue d'ensemble des dictionnaires REDCap et de leur conformité.               | [`atlas-crf-logs`](../../packages/crf-logs/README.md), [`atlas-shared-config`](../../config/shared-config/README.md), [`atlas-sveltekit-csp`](../../packages/sveltekit-csp/README.md)                                                                                                                                                                                                                                                                                                                                                                                | —            |
| [`atlas-dashboard`](../../apps/atlas-dashboard/README.md)     | Internal dashboard tracking npm and GitHub stats (releases, downloads) of the published Atlas packages | [`atlas-shared-config`](../../config/shared-config/README.md), [`atlas-stats`](../../packages/atlas-stats/README.md), [`atlas-sveltekit-csp`](../../packages/sveltekit-csp/README.md)                                                                                                                                                                                                                                                                                                                                                                                | —            |
| [`atlas-ecrin`](../../apps/ecrin/README.md)                   | Application de gestion des projets et de leurs dossiers d'avis éthiques.                               | [`atlas-auth`](../../packages/auth/README.md), [`atlas-baas`](../../packages/baas/README.md), [`atlas-errors`](../../packages/errors/README.md), [`atlas-logos-cli`](../../cli/logos/README.md), [`atlas-shared-config`](../../config/shared-config/README.md), [`atlas-sveltekit-csp`](../../packages/sveltekit-csp/README.md), [`atlas-sveltekit-handler`](../../packages/sveltekit-handler/README.md), `atlas-test-utils-sveltekit`, [`atlas-validators`](../../packages/validators/README.md)                                                                    | —            |
| [`atlas-find-an-expert`](../../apps/find-an-expert/README.md) | Outil de recherche d'expertise, basé sur l'agrégation des publications via OpenAlex.                   | [`atlas-auth`](../../packages/auth/README.md), [`atlas-baas`](../../packages/baas/README.md), [`atlas-citation-fetch`](../../packages/citation-fetch/README.md), [`atlas-errors`](../../packages/errors/README.md), [`atlas-logos-cli`](../../cli/logos/README.md), [`atlas-shared-config`](../../config/shared-config/README.md), [`atlas-sveltekit-csp`](../../packages/sveltekit-csp/README.md), [`atlas-sveltekit-handler`](../../packages/sveltekit-handler/README.md), `atlas-test-utils-sveltekit`, [`atlas-validators`](../../packages/validators/README.md) | —            |
| [`atlas-sillage`](../../apps/sillage/README.md)               | Plateforme communautaire de mise en relation autour de projets ECRIN.                                  | [`atlas-auth`](../../packages/auth/README.md), [`atlas-baas`](../../packages/baas/README.md), [`atlas-errors`](../../packages/errors/README.md), [`atlas-shared-config`](../../config/shared-config/README.md), [`atlas-sveltekit-csp`](../../packages/sveltekit-csp/README.md), [`atlas-ui`](../../ui/atlas-ui/README.md), [`atlas-validators`](../../packages/validators/README.md)                                                                                                                                                                                | —            |

### Services (`services/`)

| Paquet                                      | Rôle                                                        | Dépend de                                                                                                                | Consommé par                               |
| ------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| [`atlas-crf`](../../services/crf/README.md) | CRF Service - HTTP microservice for complex reporting forms | [`atlas-crf-client`](../../packages/crf-client/README.md), [`atlas-shared-config`](../../config/shared-config/README.md) | [`atlas-crf-cli`](../../cli/crf/README.md) |

### Bibliothèques (`packages/`)

| Paquet                                                                        | Rôle                                                                                                                          | Dépend de                                                                                                                                                                                                                                                                      | Consommé par                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`atlas-auth`](../../packages/auth/README.md)                                 | Shared authentication service for Atlas SvelteKit applications                                                                | [`atlas-baas`](../../packages/baas/README.md), [`atlas-errors`](../../packages/errors/README.md), [`atlas-shared-config`](../../config/shared-config/README.md), [`atlas-validators`](../../packages/validators/README.md)                                                     | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-ecrin`](../../apps/ecrin/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md), [`atlas-sillage`](../../apps/sillage/README.md)                                                                                                                                                                                                                                   |
| [`atlas-baas`](../../packages/baas/README.md)                                 | Shared Backend-as-a-Service (Appwrite) client utilities for Atlas applications                                                | [`atlas-errors`](../../packages/errors/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                               | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-auth`](../../packages/auth/README.md), [`atlas-ecrin`](../../apps/ecrin/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md), [`atlas-sillage`](../../apps/sillage/README.md)                                                                                                                                                                                    |
| [`atlas-citation`](../../packages/citation/README.md)                         | OpenAlex citation graph data mining library with DuckDB, ML embeddings, and string grouping                                   | [`atlas-fetch-one-api-page`](../../packages/fetch-one-api-page/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                       | [`atlas-citation-cli`](../../cli/citation/README.md)                                                                                                                                                                                                                                                                                                                                                                                         |
| [`atlas-citation-fetch`](../../packages/citation-fetch/README.md)             | Paginated fetch client for the OpenAlex citation graph API with rate limiting and queue-based state                           | [`atlas-citation-types`](../../packages/citation-types/README.md), [`atlas-fetch-one-api-page`](../../packages/fetch-one-api-page/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                    | [`atlas-citation-validate`](../../packages/citation-validate/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md), [`atlas-researcher-profiles`](../../packages/researcher-profiles/README.md), [`atlas-researcher-profiles-cli`](../../cli/researcher-profiles/README.md)                                                                                                                                              |
| [`atlas-citation-types`](../../packages/citation-types/README.md)             | TypeScript types and branded types for the OpenAlex citation graph API                                                        | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-biblio-cli`](../../cli/biblio/README.md), [`atlas-citation-fetch`](../../packages/citation-fetch/README.md), [`atlas-citation-validate`](../../packages/citation-validate/README.md), [`atlas-researcher-profiles`](../../packages/researcher-profiles/README.md), [`atlas-researcher-profiles-cli`](../../cli/researcher-profiles/README.md)                                                                                        |
| [`atlas-citation-validate`](../../packages/citation-validate/README.md)       | CLI tools for OpenAlex bibliographic data validation and reliability                                                          | [`atlas-citation-fetch`](../../packages/citation-fetch/README.md), [`atlas-citation-types`](../../packages/citation-types/README.md), [`atlas-fetch-one-api-page`](../../packages/fetch-one-api-page/README.md), [`atlas-shared-config`](../../config/shared-config/README.md) | [`atlas-biblio-cli`](../../cli/biblio/README.md)                                                                                                                                                                                                                                                                                                                                                                                             |
| [`atlas-cli-toolkit`](../../packages/cli-toolkit/README.md)                   | Framework-agnostic CLI boilerplate for the atlas monorepo: env reading, argv flag parsing and fatal-error/exit-code handling. | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-biblio-cli`](../../cli/biblio/README.md), [`atlas-citation-cli`](../../cli/citation/README.md), [`atlas-researcher-profiles-cli`](../../cli/researcher-profiles/README.md)                                                                                                                                                                                                                                                           |
| [`atlas-crf-client`](../../packages/crf-client/README.md)                     | Complex reporting form (CRF) API client for Atlas - Effect-based typed client                                                 | [`atlas-crf-core`](../../packages/crf-core/README.md), [`atlas-net`](../../packages/net/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                              | [`atlas-crf`](../../services/crf/README.md), [`atlas-crf-cli`](../../cli/crf/README.md), [`atlas-researcher-profiles`](../../packages/researcher-profiles/README.md)                                                                                                                                                                                                                                                                         |
| [`atlas-crf-core`](../../packages/crf-core/README.md)                         | Pure functional core for Complex reporting form (CRF) domain logic with Effect                                                | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-crf-client`](../../packages/crf-client/README.md), [`atlas-crf-fixtures`](../../packages/crf-fixtures/README.md), [`atlas-crf-openapi`](../../cli/crf-openapi/README.md), [`atlas-crf-project-template`](../../packages/crf-project-template/README.md)                                                                                                                                                                              |
| [`atlas-crf-fixtures`](../../packages/crf-fixtures/README.md)                 | CRF data-dictionary CSV parser and deterministic fake-record generator for tests and fixtures in the atlas monorepo.          | [`atlas-crf-core`](../../packages/crf-core/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [`atlas-crf-logs`](../../packages/crf-logs/README.md)                         | Complex reporting form (CRF) audit log fetching, enrichment and rolling-window analytics                                      | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-crf-dashboard`](../../apps/crf-dashboard/README.md), [`atlas-crf-stats-cli`](../../cli/crf-stats/README.md)                                                                                                                                                                                                                                                                                                                          |
| [`atlas-crf-project-template`](../../packages/crf-project-template/README.md) | Declarative, typed CRF project template (instruments, fields, metadata) built with Effect Schema.                             | [`atlas-crf-core`](../../packages/crf-core/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [`atlas-errors`](../../packages/errors/README.md)                             | Shared error classes for Atlas applications                                                                                   | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-auth`](../../packages/auth/README.md), [`atlas-baas`](../../packages/baas/README.md), [`atlas-ecrin`](../../apps/ecrin/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md), [`atlas-sillage`](../../apps/sillage/README.md), [`atlas-sveltekit-handler`](../../packages/sveltekit-handler/README.md), [`atlas-validators`](../../packages/validators/README.md) |
| [`atlas-fetch-one-api-page`](../../packages/fetch-one-api-page/README.md)     | A monadic API fetch library for paginated requests                                                                            | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-citation`](../../packages/citation/README.md), [`atlas-citation-fetch`](../../packages/citation-fetch/README.md), [`atlas-citation-validate`](../../packages/citation-validate/README.md)                                                                                                                                                                                                                                            |
| [`atlas-net`](../../packages/net/README.md)                                   | Network diagnostic utilities for Atlas                                                                                        | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-crf-client`](../../packages/crf-client/README.md), [`atlas-net-cli`](../../cli/net/README.md)                                                                                                                                                                                                                                                                                                                                        |
| [`atlas-researcher-profiles`](../../packages/researcher-profiles/README.md)   | Researcher profiles service layer: REDCap/CSV ingestion, OpenAlex matching, PDF/reference extraction                          | [`atlas-citation-fetch`](../../packages/citation-fetch/README.md), [`atlas-citation-types`](../../packages/citation-types/README.md), [`atlas-crf-client`](../../packages/crf-client/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                 | [`atlas-researcher-profiles-cli`](../../cli/researcher-profiles/README.md)                                                                                                                                                                                                                                                                                                                                                                   |
| [`atlas-stats`](../../packages/atlas-stats/README.md)                         | GitHub releases and npm package stats fetching, caching and computation for the Atlas monorepo                                | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-dashboard`](../../apps/atlas-dashboard/README.md), [`atlas-stats-cli`](../../cli/atlas-stats/README.md)                                                                                                                                                                                                                                                                                                                              |
| [`atlas-sveltekit-csp`](../../packages/sveltekit-csp/README.md)               | Shared Content-Security-Policy directives and security headers helpers for SvelteKit apps in the atlas monorepo.              | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-crf-dashboard`](../../apps/crf-dashboard/README.md), [`atlas-dashboard`](../../apps/atlas-dashboard/README.md), [`atlas-ecrin`](../../apps/ecrin/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md), [`atlas-sillage`](../../apps/sillage/README.md)                                                                                                           |
| [`atlas-sveltekit-handler`](../../packages/sveltekit-handler/README.md)       | Shared SvelteKit `+server.ts` handler wrapper (try/catch + uniform error mapping) for the atlas monorepo.                     | [`atlas-errors`](../../packages/errors/README.md), [`atlas-shared-config`](../../config/shared-config/README.md), `atlas-test-utils-sveltekit`                                                                                                                                 | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-ecrin`](../../apps/ecrin/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md)                                                                                                                                                                                                                                                                                    |
| `atlas-test-utils-sveltekit`                                                  | Shared SvelteKit endpoint test helpers (route-event builder, anti-XSS assertion) for the atlas monorepo.                      | [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                  | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-ecrin`](../../apps/ecrin/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md), [`atlas-sveltekit-handler`](../../packages/sveltekit-handler/README.md)                                                                                                                                                                                                           |
| [`atlas-validators`](../../packages/validators/README.md)                     | Shared validation utilities for Atlas applications                                                                            | [`atlas-errors`](../../packages/errors/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                               | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-auth`](../../packages/auth/README.md), [`atlas-ecrin`](../../apps/ecrin/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md), [`atlas-sillage`](../../apps/sillage/README.md), [`atlas-ui`](../../ui/atlas-ui/README.md)                                                                                                                                         |

### Outils en ligne de commande (`cli/`)

| Paquet                                                                     | Rôle                                                                                               | Dépend de                                                                                                                                                                                                                                                                                                                                     | Consommé par                                                                                                                                              |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`atlas-biblio-cli`](../../cli/biblio/README.md)                           | CLI entry point for OpenAlex bibliographic data validation                                         | [`atlas-citation-types`](../../packages/citation-types/README.md), [`atlas-citation-validate`](../../packages/citation-validate/README.md), [`atlas-cli-toolkit`](../../packages/cli-toolkit/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                        | —                                                                                                                                                         |
| [`atlas-citation-cli`](../../cli/citation/README.md)                       | CLI for OpenAlex citation graph researcher data curation                                           | [`atlas-citation`](../../packages/citation/README.md), [`atlas-cli-toolkit`](../../packages/cli-toolkit/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                             | —                                                                                                                                                         |
| [`atlas-crf-cli`](../../cli/crf/README.md)                                 | CRF CLI - REDCap connectivity test and CRF server management                                       | [`atlas-crf`](../../services/crf/README.md), [`atlas-crf-client`](../../packages/crf-client/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                         | —                                                                                                                                                         |
| [`atlas-crf-openapi`](../../cli/crf-openapi/README.md)                     | Complex reporting form (CRF) source analysis, OpenAPI spec extraction, and API documentation tools | [`atlas-crf-core`](../../packages/crf-core/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                          | —                                                                                                                                                         |
| [`atlas-crf-stats-cli`](../../cli/crf-stats/README.md)                     | CLI to test CRF (REDCap) project tokens and inspect API responses                                  | [`atlas-crf-logs`](../../packages/crf-logs/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                          | —                                                                                                                                                         |
| [`atlas-logos-cli`](../../cli/logos/README.md)                             | CLI to copy Atlas logo assets into a target directory (typically a SvelteKit app's static/ folder) | [`atlas-logos`](../../assets/logos/README.md)                                                                                                                                                                                                                                                                                                 | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-ecrin`](../../apps/ecrin/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md) |
| [`atlas-net-cli`](../../cli/net/README.md)                                 | Network diagnostic CLI for Atlas                                                                   | [`atlas-net`](../../packages/net/README.md), [`atlas-shared-config`](../../config/shared-config/README.md)                                                                                                                                                                                                                                    | —                                                                                                                                                         |
| [`atlas-researcher-profiles-cli`](../../cli/researcher-profiles/README.md) | Researcher profiles CLI: fetch OpenAlex works from CSV or REDCap and write to REDCap               | [`atlas-citation-fetch`](../../packages/citation-fetch/README.md), [`atlas-citation-types`](../../packages/citation-types/README.md), [`atlas-cli-toolkit`](../../packages/cli-toolkit/README.md), [`atlas-researcher-profiles`](../../packages/researcher-profiles/README.md), [`atlas-shared-config`](../../config/shared-config/README.md) | —                                                                                                                                                         |
| [`atlas-stats-cli`](../../cli/atlas-stats/README.md)                       | CLI interactif pour visualiser les statistiques GitHub et npm du dépôt Atlas                       | [`atlas-shared-config`](../../config/shared-config/README.md), [`atlas-stats`](../../packages/atlas-stats/README.md)                                                                                                                                                                                                                          | —                                                                                                                                                         |

### Interface partagée (`ui/`)

| Paquet                                    | Rôle                                                                         | Dépend de                                                                                                                | Consommé par                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| [`atlas-ui`](../../ui/atlas-ui/README.md) | Shared Svelte UI components for the atlas monorepo, previewed via Storybook. | [`atlas-shared-config`](../../config/shared-config/README.md), [`atlas-validators`](../../packages/validators/README.md) | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-sillage`](../../apps/sillage/README.md) |

### Configuration (`config/`)

| Paquet                                                        | Rôle                                                                     | Dépend de | Consommé par                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`atlas-shared-config`](../../config/shared-config/README.md) | Shared TypeScript, ESLint, and Prettier configuration for Atlas projects | —         | [`atlas-amarre`](../../apps/amarre/README.md), [`atlas-amarre-sandbox`](../../sandbox/amarre-sandbox/README.md), [`atlas-auth`](../../packages/auth/README.md), [`atlas-baas`](../../packages/baas/README.md), [`atlas-biblio-cli`](../../cli/biblio/README.md), [`atlas-citation`](../../packages/citation/README.md), [`atlas-citation-cli`](../../cli/citation/README.md), [`atlas-citation-fetch`](../../packages/citation-fetch/README.md), [`atlas-citation-types`](../../packages/citation-types/README.md), [`atlas-citation-validate`](../../packages/citation-validate/README.md), [`atlas-cli-toolkit`](../../packages/cli-toolkit/README.md), [`atlas-crf`](../../services/crf/README.md), [`atlas-crf-cli`](../../cli/crf/README.md), [`atlas-crf-client`](../../packages/crf-client/README.md), [`atlas-crf-core`](../../packages/crf-core/README.md), [`atlas-crf-dashboard`](../../apps/crf-dashboard/README.md), [`atlas-crf-fixtures`](../../packages/crf-fixtures/README.md), [`atlas-crf-logs`](../../packages/crf-logs/README.md), [`atlas-crf-openapi`](../../cli/crf-openapi/README.md), [`atlas-crf-project-template`](../../packages/crf-project-template/README.md), [`atlas-crf-sandbox`](../../sandbox/crf-sandbox/README.md), [`atlas-crf-stats-cli`](../../cli/crf-stats/README.md), [`atlas-dashboard`](../../apps/atlas-dashboard/README.md), [`atlas-ecrin`](../../apps/ecrin/README.md), [`atlas-errors`](../../packages/errors/README.md), [`atlas-fetch-one-api-page`](../../packages/fetch-one-api-page/README.md), [`atlas-find-an-expert`](../../apps/find-an-expert/README.md), [`atlas-net`](../../packages/net/README.md), [`atlas-net-cli`](../../cli/net/README.md), [`atlas-researcher-profiles`](../../packages/researcher-profiles/README.md), [`atlas-researcher-profiles-cli`](../../cli/researcher-profiles/README.md), [`atlas-sillage`](../../apps/sillage/README.md), [`atlas-sillage-sandbox`](../../sandbox/sillage-sandbox/README.md), [`atlas-stats`](../../packages/atlas-stats/README.md), [`atlas-stats-cli`](../../cli/atlas-stats/README.md), [`atlas-sveltekit-csp`](../../packages/sveltekit-csp/README.md), [`atlas-sveltekit-handler`](../../packages/sveltekit-handler/README.md), `atlas-test-utils-sveltekit`, [`atlas-ui`](../../ui/atlas-ui/README.md), [`atlas-validators`](../../packages/validators/README.md) |

### Ressources (`assets/`)

| Paquet                                        | Rôle                                      | Dépend de | Consommé par                                   |
| --------------------------------------------- | ----------------------------------------- | --------- | ---------------------------------------------- |
| [`atlas-logos`](../../assets/logos/README.md) | Logos and brand assets for Atlas projects | —         | [`atlas-logos-cli`](../../cli/logos/README.md) |

### Bancs d'essai (`sandbox/`)

| Paquet                                                             | Rôle                                                                                                                                                                                                        | Dépend de                                                     | Consommé par |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------ |
| [`atlas-amarre-sandbox`](../../sandbox/amarre-sandbox/README.md)   | Local Docker sandbox for the amarre app: bundles a CRF (REDCap) instance, a self-hosted BaaS (Appwrite), and the wiring scripts needed to run amarre end-to-end without depending on production services.   | [`atlas-shared-config`](../../config/shared-config/README.md) | —            |
| [`atlas-crf-sandbox`](../../sandbox/crf-sandbox/README.md)         | CRF (REDCap) testing sandbox - Docker environment and contract tests for validating OpenAPI specs                                                                                                           | [`atlas-shared-config`](../../config/shared-config/README.md) | —            |
| [`atlas-sillage-sandbox`](../../sandbox/sillage-sandbox/README.md) | Local Docker sandbox for the sillage app: bundles a CRF (REDCap) instance, a self-hosted BaaS (Appwrite), and the wiring scripts needed to run sillage end-to-end without depending on production services. | [`atlas-shared-config`](../../config/shared-config/README.md) | —            |

## Graphes de dépendances par livrable

Le graphe complet (toutes les dépendances internes d'un coup) est
illisible. On le découpe **par livrable** : chaque application ou outil en
ligne de commande — un paquet que personne d'autre ne consomme — a son
propre graphe, limité à ses **dépendances transitives**. Une flèche
`A --> B` signifie « A dépend de B » (tous champs de dépendances confondus).
Un livrable sans dépendance interne n'a pas de graphe.

### [`atlas-amarre`](../../apps/amarre/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_amarre["atlas-amarre"]
  _univ_lehavre_atlas_auth["atlas-auth"]
  _univ_lehavre_atlas_baas["atlas-baas"]
  _univ_lehavre_atlas_errors["atlas-errors"]
  _univ_lehavre_atlas_logos["atlas-logos"]
  _univ_lehavre_atlas_logos_cli["atlas-logos-cli"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_sveltekit_csp["atlas-sveltekit-csp"]
  _univ_lehavre_atlas_sveltekit_handler["atlas-sveltekit-handler"]
  _univ_lehavre_atlas_test_utils_sveltekit["atlas-test-utils-sveltekit"]
  _univ_lehavre_atlas_ui["atlas-ui"]
  _univ_lehavre_atlas_validators["atlas-validators"]
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_auth
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_baas
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_logos_cli
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_sveltekit_csp
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_sveltekit_handler
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_test_utils_sveltekit
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_ui
  _univ_lehavre_atlas_amarre --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_baas
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_baas --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_baas --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_errors --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_logos_cli --> _univ_lehavre_atlas_logos
  _univ_lehavre_atlas_sveltekit_csp --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sveltekit_handler --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_sveltekit_handler --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sveltekit_handler --> _univ_lehavre_atlas_test_utils_sveltekit
  _univ_lehavre_atlas_test_utils_sveltekit --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_ui --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_ui --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_validators --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_validators --> _univ_lehavre_atlas_shared_config
```

### [`atlas-crf-dashboard`](../../apps/crf-dashboard/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_crf_dashboard["atlas-crf-dashboard"]
  _univ_lehavre_atlas_crf_logs["atlas-crf-logs"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_sveltekit_csp["atlas-sveltekit-csp"]
  _univ_lehavre_atlas_crf_dashboard --> _univ_lehavre_atlas_crf_logs
  _univ_lehavre_atlas_crf_dashboard --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_dashboard --> _univ_lehavre_atlas_sveltekit_csp
  _univ_lehavre_atlas_crf_logs --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sveltekit_csp --> _univ_lehavre_atlas_shared_config
```

### [`atlas-dashboard`](../../apps/atlas-dashboard/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_dashboard["atlas-dashboard"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_stats["atlas-stats"]
  _univ_lehavre_atlas_sveltekit_csp["atlas-sveltekit-csp"]
  _univ_lehavre_atlas_dashboard --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_dashboard --> _univ_lehavre_atlas_stats
  _univ_lehavre_atlas_dashboard --> _univ_lehavre_atlas_sveltekit_csp
  _univ_lehavre_atlas_stats --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sveltekit_csp --> _univ_lehavre_atlas_shared_config
```

### [`atlas-ecrin`](../../apps/ecrin/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_auth["atlas-auth"]
  _univ_lehavre_atlas_baas["atlas-baas"]
  _univ_lehavre_atlas_ecrin["atlas-ecrin"]
  _univ_lehavre_atlas_errors["atlas-errors"]
  _univ_lehavre_atlas_logos["atlas-logos"]
  _univ_lehavre_atlas_logos_cli["atlas-logos-cli"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_sveltekit_csp["atlas-sveltekit-csp"]
  _univ_lehavre_atlas_sveltekit_handler["atlas-sveltekit-handler"]
  _univ_lehavre_atlas_test_utils_sveltekit["atlas-test-utils-sveltekit"]
  _univ_lehavre_atlas_validators["atlas-validators"]
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_baas
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_baas --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_baas --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_ecrin --> _univ_lehavre_atlas_auth
  _univ_lehavre_atlas_ecrin --> _univ_lehavre_atlas_baas
  _univ_lehavre_atlas_ecrin --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_ecrin --> _univ_lehavre_atlas_logos_cli
  _univ_lehavre_atlas_ecrin --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_ecrin --> _univ_lehavre_atlas_sveltekit_csp
  _univ_lehavre_atlas_ecrin --> _univ_lehavre_atlas_sveltekit_handler
  _univ_lehavre_atlas_ecrin --> _univ_lehavre_atlas_test_utils_sveltekit
  _univ_lehavre_atlas_ecrin --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_errors --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_logos_cli --> _univ_lehavre_atlas_logos
  _univ_lehavre_atlas_sveltekit_csp --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sveltekit_handler --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_sveltekit_handler --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sveltekit_handler --> _univ_lehavre_atlas_test_utils_sveltekit
  _univ_lehavre_atlas_test_utils_sveltekit --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_validators --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_validators --> _univ_lehavre_atlas_shared_config
```

### [`atlas-find-an-expert`](../../apps/find-an-expert/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_auth["atlas-auth"]
  _univ_lehavre_atlas_baas["atlas-baas"]
  _univ_lehavre_atlas_citation_fetch["atlas-citation-fetch"]
  _univ_lehavre_atlas_citation_types["atlas-citation-types"]
  _univ_lehavre_atlas_errors["atlas-errors"]
  _univ_lehavre_atlas_fetch_one_api_page["atlas-fetch-one-api-page"]
  _univ_lehavre_atlas_find_an_expert["atlas-find-an-expert"]
  _univ_lehavre_atlas_logos["atlas-logos"]
  _univ_lehavre_atlas_logos_cli["atlas-logos-cli"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_sveltekit_csp["atlas-sveltekit-csp"]
  _univ_lehavre_atlas_sveltekit_handler["atlas-sveltekit-handler"]
  _univ_lehavre_atlas_test_utils_sveltekit["atlas-test-utils-sveltekit"]
  _univ_lehavre_atlas_validators["atlas-validators"]
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_baas
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_baas --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_baas --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_citation_fetch --> _univ_lehavre_atlas_citation_types
  _univ_lehavre_atlas_citation_fetch --> _univ_lehavre_atlas_fetch_one_api_page
  _univ_lehavre_atlas_citation_fetch --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_citation_types --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_errors --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_fetch_one_api_page --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_auth
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_baas
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_citation_fetch
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_logos_cli
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_sveltekit_csp
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_sveltekit_handler
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_test_utils_sveltekit
  _univ_lehavre_atlas_find_an_expert --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_logos_cli --> _univ_lehavre_atlas_logos
  _univ_lehavre_atlas_sveltekit_csp --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sveltekit_handler --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_sveltekit_handler --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sveltekit_handler --> _univ_lehavre_atlas_test_utils_sveltekit
  _univ_lehavre_atlas_test_utils_sveltekit --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_validators --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_validators --> _univ_lehavre_atlas_shared_config
```

### [`atlas-sillage`](../../apps/sillage/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_auth["atlas-auth"]
  _univ_lehavre_atlas_baas["atlas-baas"]
  _univ_lehavre_atlas_errors["atlas-errors"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_sillage["atlas-sillage"]
  _univ_lehavre_atlas_sveltekit_csp["atlas-sveltekit-csp"]
  _univ_lehavre_atlas_ui["atlas-ui"]
  _univ_lehavre_atlas_validators["atlas-validators"]
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_baas
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_auth --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_baas --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_baas --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_errors --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sillage --> _univ_lehavre_atlas_auth
  _univ_lehavre_atlas_sillage --> _univ_lehavre_atlas_baas
  _univ_lehavre_atlas_sillage --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_sillage --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_sillage --> _univ_lehavre_atlas_sveltekit_csp
  _univ_lehavre_atlas_sillage --> _univ_lehavre_atlas_ui
  _univ_lehavre_atlas_sillage --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_sveltekit_csp --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_ui --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_ui --> _univ_lehavre_atlas_validators
  _univ_lehavre_atlas_validators --> _univ_lehavre_atlas_errors
  _univ_lehavre_atlas_validators --> _univ_lehavre_atlas_shared_config
```

### [`atlas-biblio-cli`](../../cli/biblio/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_biblio_cli["atlas-biblio-cli"]
  _univ_lehavre_atlas_citation_fetch["atlas-citation-fetch"]
  _univ_lehavre_atlas_citation_types["atlas-citation-types"]
  _univ_lehavre_atlas_citation_validate["atlas-citation-validate"]
  _univ_lehavre_atlas_cli_toolkit["atlas-cli-toolkit"]
  _univ_lehavre_atlas_fetch_one_api_page["atlas-fetch-one-api-page"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_biblio_cli --> _univ_lehavre_atlas_citation_types
  _univ_lehavre_atlas_biblio_cli --> _univ_lehavre_atlas_citation_validate
  _univ_lehavre_atlas_biblio_cli --> _univ_lehavre_atlas_cli_toolkit
  _univ_lehavre_atlas_biblio_cli --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_citation_fetch --> _univ_lehavre_atlas_citation_types
  _univ_lehavre_atlas_citation_fetch --> _univ_lehavre_atlas_fetch_one_api_page
  _univ_lehavre_atlas_citation_fetch --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_citation_types --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_citation_validate --> _univ_lehavre_atlas_citation_fetch
  _univ_lehavre_atlas_citation_validate --> _univ_lehavre_atlas_citation_types
  _univ_lehavre_atlas_citation_validate --> _univ_lehavre_atlas_fetch_one_api_page
  _univ_lehavre_atlas_citation_validate --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_cli_toolkit --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_fetch_one_api_page --> _univ_lehavre_atlas_shared_config
```

### [`atlas-citation-cli`](../../cli/citation/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_citation["atlas-citation"]
  _univ_lehavre_atlas_citation_cli["atlas-citation-cli"]
  _univ_lehavre_atlas_cli_toolkit["atlas-cli-toolkit"]
  _univ_lehavre_atlas_fetch_one_api_page["atlas-fetch-one-api-page"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_citation --> _univ_lehavre_atlas_fetch_one_api_page
  _univ_lehavre_atlas_citation --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_citation_cli --> _univ_lehavre_atlas_citation
  _univ_lehavre_atlas_citation_cli --> _univ_lehavre_atlas_cli_toolkit
  _univ_lehavre_atlas_citation_cli --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_cli_toolkit --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_fetch_one_api_page --> _univ_lehavre_atlas_shared_config
```

### [`atlas-crf-cli`](../../cli/crf/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_crf["atlas-crf"]
  _univ_lehavre_atlas_crf_cli["atlas-crf-cli"]
  _univ_lehavre_atlas_crf_client["atlas-crf-client"]
  _univ_lehavre_atlas_crf_core["atlas-crf-core"]
  _univ_lehavre_atlas_net["atlas-net"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_crf --> _univ_lehavre_atlas_crf_client
  _univ_lehavre_atlas_crf --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_cli --> _univ_lehavre_atlas_crf
  _univ_lehavre_atlas_crf_cli --> _univ_lehavre_atlas_crf_client
  _univ_lehavre_atlas_crf_cli --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_client --> _univ_lehavre_atlas_crf_core
  _univ_lehavre_atlas_crf_client --> _univ_lehavre_atlas_net
  _univ_lehavre_atlas_crf_client --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_core --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_net --> _univ_lehavre_atlas_shared_config
```

### [`atlas-crf-openapi`](../../cli/crf-openapi/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_crf_core["atlas-crf-core"]
  _univ_lehavre_atlas_crf_openapi["atlas-crf-openapi"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_crf_core --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_openapi --> _univ_lehavre_atlas_crf_core
  _univ_lehavre_atlas_crf_openapi --> _univ_lehavre_atlas_shared_config
```

### [`atlas-crf-stats-cli`](../../cli/crf-stats/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_crf_logs["atlas-crf-logs"]
  _univ_lehavre_atlas_crf_stats_cli["atlas-crf-stats-cli"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_crf_logs --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_stats_cli --> _univ_lehavre_atlas_crf_logs
  _univ_lehavre_atlas_crf_stats_cli --> _univ_lehavre_atlas_shared_config
```

### [`atlas-net-cli`](../../cli/net/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_net["atlas-net"]
  _univ_lehavre_atlas_net_cli["atlas-net-cli"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_net --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_net_cli --> _univ_lehavre_atlas_net
  _univ_lehavre_atlas_net_cli --> _univ_lehavre_atlas_shared_config
```

### [`atlas-researcher-profiles-cli`](../../cli/researcher-profiles/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_citation_fetch["atlas-citation-fetch"]
  _univ_lehavre_atlas_citation_types["atlas-citation-types"]
  _univ_lehavre_atlas_cli_toolkit["atlas-cli-toolkit"]
  _univ_lehavre_atlas_crf_client["atlas-crf-client"]
  _univ_lehavre_atlas_crf_core["atlas-crf-core"]
  _univ_lehavre_atlas_fetch_one_api_page["atlas-fetch-one-api-page"]
  _univ_lehavre_atlas_net["atlas-net"]
  _univ_lehavre_atlas_researcher_profiles["atlas-researcher-profiles"]
  _univ_lehavre_atlas_researcher_profiles_cli["atlas-researcher-profiles-cli"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_citation_fetch --> _univ_lehavre_atlas_citation_types
  _univ_lehavre_atlas_citation_fetch --> _univ_lehavre_atlas_fetch_one_api_page
  _univ_lehavre_atlas_citation_fetch --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_citation_types --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_cli_toolkit --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_client --> _univ_lehavre_atlas_crf_core
  _univ_lehavre_atlas_crf_client --> _univ_lehavre_atlas_net
  _univ_lehavre_atlas_crf_client --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_core --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_fetch_one_api_page --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_net --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_researcher_profiles --> _univ_lehavre_atlas_citation_fetch
  _univ_lehavre_atlas_researcher_profiles --> _univ_lehavre_atlas_citation_types
  _univ_lehavre_atlas_researcher_profiles --> _univ_lehavre_atlas_crf_client
  _univ_lehavre_atlas_researcher_profiles --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_researcher_profiles_cli --> _univ_lehavre_atlas_citation_fetch
  _univ_lehavre_atlas_researcher_profiles_cli --> _univ_lehavre_atlas_citation_types
  _univ_lehavre_atlas_researcher_profiles_cli --> _univ_lehavre_atlas_cli_toolkit
  _univ_lehavre_atlas_researcher_profiles_cli --> _univ_lehavre_atlas_researcher_profiles
  _univ_lehavre_atlas_researcher_profiles_cli --> _univ_lehavre_atlas_shared_config
```

### [`atlas-stats-cli`](../../cli/atlas-stats/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_stats["atlas-stats"]
  _univ_lehavre_atlas_stats_cli["atlas-stats-cli"]
  _univ_lehavre_atlas_stats --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_stats_cli --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_stats_cli --> _univ_lehavre_atlas_stats
```

### [`atlas-crf-fixtures`](../../packages/crf-fixtures/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_crf_core["atlas-crf-core"]
  _univ_lehavre_atlas_crf_fixtures["atlas-crf-fixtures"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_crf_core --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_fixtures --> _univ_lehavre_atlas_crf_core
  _univ_lehavre_atlas_crf_fixtures --> _univ_lehavre_atlas_shared_config
```

### [`atlas-crf-project-template`](../../packages/crf-project-template/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_crf_core["atlas-crf-core"]
  _univ_lehavre_atlas_crf_project_template["atlas-crf-project-template"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_crf_core --> _univ_lehavre_atlas_shared_config
  _univ_lehavre_atlas_crf_project_template --> _univ_lehavre_atlas_crf_core
  _univ_lehavre_atlas_crf_project_template --> _univ_lehavre_atlas_shared_config
```

### [`atlas-amarre-sandbox`](../../sandbox/amarre-sandbox/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_amarre_sandbox["atlas-amarre-sandbox"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_amarre_sandbox --> _univ_lehavre_atlas_shared_config
```

### [`atlas-crf-sandbox`](../../sandbox/crf-sandbox/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_crf_sandbox["atlas-crf-sandbox"]
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_crf_sandbox --> _univ_lehavre_atlas_shared_config
```

### [`atlas-sillage-sandbox`](../../sandbox/sillage-sandbox/README.md)

```mermaid
flowchart TD
  _univ_lehavre_atlas_shared_config["atlas-shared-config"]
  _univ_lehavre_atlas_sillage_sandbox["atlas-sillage-sandbox"]
  _univ_lehavre_atlas_sillage_sandbox --> _univ_lehavre_atlas_shared_config
```

<!-- AUTO-GENERATED:packages-map END -->
