# Documentation audit

> **Last updated:** 4 May 2026

This audit tracks the current state of the Atlas documentation after the workspace was reorganized into `apps/`, `cli/`, `packages/`, `services/`, `config/` and `sandbox/`.

## Executive summary

| Category        | Current state                                                     | Priority |
| --------------- | ----------------------------------------------------------------- | :------: |
| VitePress site  | Builds successfully; generated API and stats are ignored          |  Medium  |
| README files    | Broad coverage across apps, CLIs, packages and services           |  Medium  |
| Local links     | Main stale links have been corrected; keep checking after moves   |   High   |
| Public assets   | Logos are exposed through a minimal `docs/public/logos` directory |  Medium  |
| TypeDoc / TSDoc | API docs build, but TypeDoc warnings remain                       |  Medium  |

## 1. Documentation structure

Atlas uses three complementary documentation layers:

1. `README.md` files near each workspace unit for quick package-level orientation.
2. `docs/` for the VitePress documentation site.
3. Generated API reference under `docs/api/`, produced by TypeDoc and ignored by Git.

The documentation now follows the current repository layout:

| Area          | Path        |
| ------------- | ----------- |
| Applications  | `apps/`     |
| CLI tools     | `cli/`      |
| Libraries     | `packages/` |
| Services      | `services/` |
| Shared config | `config/`   |
| Sandboxes     | `sandbox/`  |

## 2. VitePress and generated files

The documentation build is configured to regenerate API reference before the API sidebar:

```bash
pnpm docs:build
```

The expected generated artifacts are:

| Artifact                                | Status  |
| --------------------------------------- | ------- |
| `docs/api/`                             | Ignored |
| `docs/.vitepress/dist/`                 | Ignored |
| `docs/.vitepress/cache/`                | Ignored |
| `docs/.vitepress/data/repo-stats.json`  | Ignored |
| `docs/.vitepress/data/api-sidebar.json` | Ignored |

`docs/.vitepress/data/repo-stats.data.ts` is source code and remains tracked.

## 3. README coverage

README coverage is good across the monorepo. The root README links to the active workspace paths:

| Module             | Path                   |
| ------------------ | ---------------------- |
| ECRIN              | `apps/ecrin`           |
| AMARRE             | `apps/amarre`          |
| Find an Expert     | `apps/find-an-expert`  |
| CRF service        | `services/crf`         |
| REDCap OpenAPI CLI | `cli/redcap-openapi`   |
| Shared config      | `config/shared-config` |

The application README files use logos from `packages/logos/` when rendered from GitHub, while VitePress uses the curated public copies in `docs/public/logos/`.

## 4. Link integrity

The most important stale route families have been removed from the active documentation:

| Old route family          | Current location                                 |
| ------------------------- | ------------------------------------------------ |
| `/guide/audit/*`          | `/projects/atlas/*` or `/projects/ecrin/audit/*` |
| `/guide/find-an-expert/*` | `/projects/ecrin/find-an-expert/*`               |
| `/audit/ecrin/*`          | `/projects/ecrin/audit/*`                        |
| `/roadmaps/ecrin/`        | Removed until an active roadmap exists           |
| `packages/ecrin`          | `apps/ecrin`                                     |
| `packages/find-an-expert` | `apps/find-an-expert`                            |

Recommendation: add a lightweight markdown-link check to CI so future directory moves cannot silently leave stale local links behind.

## 5. TypeDoc / TSDoc

`pnpm docs:api` generates the TypeDoc reference successfully. Remaining warnings are mostly about:

- OpenAPI-generated comments using tags such as `@description`.
- A few stale `@param` names.
- Referenced internal types that are not part of the generated public documentation.
- CLI packages without exported library entry points.

Priority should go to public library exports in `packages/`, `services/crf` and reusable CLI modules. Svelte application internals do not need the same level of TypeDoc coverage unless they become shared APIs.

## 6. Asset policy

`packages/logos/` remains the source of truth for logo assets. `docs/public/logos/` contains only the files that must be served by the documentation site:

| File                   | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `ulhn.svg`             | Université Le Havre Normandie                                |
| `cptmp.png`            | Campus Polytechnique des Territoires Maritimes et Portuaires |
| `eunicoast.png`        | EUNICoast                                                    |
| `france-2030.png`      | France 2030                                                  |
| `region-normandie.jpg` | Région Normandie                                             |

This avoids publishing package metadata, tests, coverage reports or dependency folders through VitePress.

## 7. Recommended next steps

1. Add a CI check for local Markdown links.
2. Decide whether application packages should produce TypeDoc pages, or keep API reference limited to libraries and services.
3. Reduce TypeDoc warnings by normalizing JSDoc tags and public type exports.
4. Keep this audit updated when documentation routes or workspace folders move.
