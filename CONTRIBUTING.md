# Contributing to Atlas

Thank you for contributing to the Atlas project! This document explains the conventions and contribution processes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development Workflow](#development-workflow)
- [Git Hooks](#git-hooks)
- [Available Scripts](#available-scripts)
- [Commit Conventions](#commit-conventions)
- [Project Structure](#project-structure)

## Prerequisites

- Node.js >= 24.0.0 (see `.nvmrc`)
- pnpm >= 10.x
- Git

```bash
# Install the correct Node version
nvm use

# Install pnpm if necessary
corepack enable
```

## Installation

```bash
# Clone the repository
git clone https://github.com/univ-lehavre/atlas.git
cd atlas

# Install dependencies
pnpm install
```

Git hooks (lefthook) are automatically installed via the `prepare` script.

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feat/my-new-feature
# or
git checkout -b fix/bug-fix
```

### 2. Develop

```bash
# Watch mode (all packages)
pnpm dev

# A specific package
pnpm -F @univ-lehavre/atlas-crf dev
```

### 3. Check Before Committing

```bash
# Full CI check (format + lint + typecheck + tests + build)
pnpm ci:checks

# All audits (security + licenses + unused + structure + duplicates + size)
pnpm ci:audit
```

### 4. Commit

The `pre-commit` hook automatically runs in parallel:

- Branch guard (blocks direct commits to `main`)
- Prettier (format check)
- ESLint (lint)
- TypeScript (typecheck)
- SvelteKit (svelte:check)

### 5. Push

The `pre-push` hook checks:

- That you are not on `main` (direct push is forbidden)
- That your branch is synchronized with `origin/main`
- Security audit (`audit:security`)
- Dependency licenses (`audit:licenses`)
- Lockfile integrity (`pnpm install --frozen-lockfile`)
- Tests (`test:coverage`)
- Duplicate code (`audit:duplicates`)
- Unused code (`audit:unused`)

### 6. Create a Changeset

Before opening a PR, create a changeset to document the version bump:

```bash
pnpm changeset:add
```

### 7. Create a Pull Request

Push your branch and create a PR on GitHub targeting `main`.

## Git Hooks

### pre-commit

Executed before each commit. If a check fails, the commit is rejected.

| Check        | Description                     |
| ------------ | ------------------------------- |
| check-branch | Blocks direct commits to `main` |
| format       | Prettier format check           |
| lint         | ESLint                          |
| typecheck    | TypeScript verification         |
| svelte:check | SvelteKit diagnostics           |

### pre-push

Executed before each push.

| Check          | Description                        |
| -------------- | ---------------------------------- |
| check-branch   | Blocks direct push to `main`       |
| check-sync     | Warns if branch is not up to date  |
| check-audit    | npm security audit (high severity) |
| check-licenses | License verification               |
| check-lockfile | pnpm lockfile integrity            |
| test           | Test coverage                      |
| cpd            | Duplicate code detection           |
| knip           | Unused code detection              |

### commit-msg

Verifies commit message format (Conventional Commits). Email lines are automatically stripped.

### Temporarily Bypassing Hooks

Only in emergencies:

```bash
# Bypass pre-commit
git commit --no-verify -m "wip: work in progress"

# Bypass pre-push
git push --no-verify
```

> **Warning**: Do not abuse `--no-verify`. Hooks exist to ensure code quality.

## Available Scripts

### Development

| Script               | Description                 |
| -------------------- | --------------------------- |
| `pnpm dev`           | Watch mode for all packages |
| `pnpm build`         | Build all packages          |
| `pnpm test`          | Run tests                   |
| `pnpm test:coverage` | Run tests with coverage     |
| `pnpm typecheck`     | TypeScript verification     |
| `pnpm lint`          | ESLint                      |
| `pnpm format`        | Auto-fix formatting         |
| `pnpm svelte:check`  | SvelteKit diagnostics       |

### CI

| Script           | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `pnpm ci:checks` | format:check + lint + typecheck + test:coverage + build (via turbo) |
| `pnpm ci:audit`  | security + licenses + unused + structure + duplicates + size        |

### Audits

| Script                  | Description                           |
| ----------------------- | ------------------------------------- |
| `pnpm audit:security`   | npm security audit (high severity)    |
| `pnpm audit:licenses`   | Allowed licenses verification         |
| `pnpm audit:unused`     | Unused exports/dependencies (knip)    |
| `pnpm audit:structure`  | Workspace structure verification      |
| `pnpm audit:duplicates` | Duplicate code detection (jscpd)      |
| `pnpm audit:size`       | Bundle size verification (size-limit) |
| `pnpm audit:versions`   | Outdated dependencies (taze)          |

### Documentation

| Script              | Description                 |
| ------------------- | --------------------------- |
| `pnpm docs:dev`     | Documentation in dev mode   |
| `pnpm docs:build`   | Build documentation         |
| `pnpm docs:preview` | Preview built documentation |
| `pnpm docs:api`     | Generate API docs (TypeDoc) |

### Release

| Script                   | Description                         |
| ------------------------ | ----------------------------------- |
| `pnpm changeset:add`     | Create a changeset                  |
| `pnpm changeset:version` | Bump versions and update changelogs |
| `pnpm changeset:publish` | Publish packages to npm             |
| `pnpm release`           | Full release (build + publish)      |

### Utilities

| Script       | Description                           |
| ------------ | ------------------------------------- |
| `pnpm clean` | Remove all build artifacts and caches |

## Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

### Allowed Types

| Type       | Description                 |
| ---------- | --------------------------- |
| `feat`     | New feature                 |
| `fix`      | Bug fix                     |
| `docs`     | Documentation               |
| `style`    | Formatting (no code change) |
| `refactor` | Refactoring                 |
| `perf`     | Performance improvement     |
| `test`     | Add/modify tests            |
| `build`    | Build system                |
| `ci`       | CI configuration            |
| `chore`    | Maintenance                 |
| `revert`   | Revert a commit             |

### Suggested Scopes

| Scope       | Package/Area                                          |
| ----------- | ----------------------------------------------------- |
| `amarre`    | apps/amarre                                           |
| `dashboard` | apps/atlas-dashboard                                  |
| `ecrin`     | apps/ecrin                                            |
| `find`      | apps/find-an-expert                                   |
| `crf`       | services/crf, cli/crf, packages/crf-\*                |
| `redcap`    | apps/redcap-dashboard (until PR 4)                    |
| `net`       | packages/net, cli/net                                 |
| `citation` | packages/citation*, cli/citation                       |
| `profiles`  | packages/researcher-profiles, cli/researcher-profiles |
| `deps`      | Dependencies                                          |
| `config`    | Configuration                                         |
| `ci`        | CI/CD                                                 |
| `docs`      | Documentation                                         |

### Examples

```bash
feat(crf): add exportRecords method
fix(openalex): handle empty author list
docs: update contributing guide
chore(deps): update effect to v3.21
ci: add size-limit check
test(profiles): add consent service coverage
```

## Project Structure

```
atlas/
├── apps/                    # SvelteKit web applications
│   ├── amarre/              # Survey management app
│   ├── atlas-dashboard/     # Main dashboard
│   ├── ecrin/               # ECRIN portal
│   ├── find-an-expert/      # Researcher discovery app
│   └── redcap-dashboard/    # REDCap dashboard
│
├── packages/                # Shared libraries
│   ├── appwrite/            # Appwrite client utilities
│   ├── auth/                # Authentication helpers
│   ├── errors/              # Shared error types
│   ├── citation/            # OpenAlex citation graph domain logic
│   ├── citation-fetch/      # OpenAlex citation graph API client
│   ├── citation-types/      # OpenAlex citation graph type definitions
│   ├── citation-validate/   # OpenAlex citation graph data validation
│   ├── crf-client/          # Clinical research form (CRF / REDCap) HTTP client
│   ├── crf-core/            # CRF / REDCap domain types & adapters
│   ├── crf-logs/            # CRF / REDCap audit log types
│   ├── fetch-one-api-page/  # Paginated API fetching
│   ├── net/                 # Network utilities
│   ├── researcher-profiles/ # Researcher profile generation
│   └── validators/          # Shared validation utilities
│
├── services/                # Backend microservices
│   └── crf/                 # CRF HTTP service (Hono)
│
├── cli/                     # Command-line tools
│   ├── atlas-stats/         # Atlas statistics CLI
│   ├── biblio/              # Bibliography CLI
│   ├── citation/            # OpenAlex citation graph CLI
│   ├── crf/                 # CRF management CLI
│   ├── net/                 # Network diagnostics CLI
│   ├── redcap-openapi/      # REDCap OpenAPI spec generator
│   ├── redcap-stats/        # REDCap statistics CLI
│   └── researcher-profiles/ # Researcher profile CLI
│
├── config/
│   └── shared-config/       # Shared ESLint, Prettier, TypeScript configs
│
└── docs/                    # VitePress documentation
```

## Architectural Rules by Category

Each category has a strict responsibility boundary. Code placed in the wrong category is a bug in architecture.

| Category    | Exclusive role                    | Delegates to            | Typical misplaced code                                                    |
| ----------- | --------------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| `packages/` | Reusable domain logic and clients | Nothing in the monorepo | HTTP handlers, Svelte runtime, CLI prompts, terminal I/O                  |
| `apps/`     | SvelteKit web applications        | `packages/`, `ui/`      | Business rules, reusable domain transformations, imports from another app |
| `services/` | HTTP microservices                | `packages/`             | Business rules, data transformations, cross-service imports               |
| `cli/`      | Command-line adapters             | `packages/`             | Business rules, HTTP routing, reusable transformations                    |
| `ui/`       | Shared Svelte components          | `packages/`             | Routes, server-only code, domain rules, CLI I/O                           |
| `config/`   | Shared tooling configuration      | Nothing at runtime      | Executable or product runtime code                                        |
| `sandbox/`  | Experiments and prototypes        | Anything needed locally | Shared production code, exported APIs, dependencies from shipped code     |
| `scripts/`  | Repository automation             | Workspace packages      | Product runtime code, reusable domain logic, user-facing CLIs             |

### `packages/` — Reusable Business Logic

- **Contains**: domain types, algorithms, API clients, data transformations
- **Style**: functional programming + [Effect](https://effect.website/) for error handling and composition
- **No**: routing, HTTP handlers, UI, CLI prompts, direct process I/O
- **Test coverage target**: ≥ 80%
- **Rule**: a package must be importable by any other workspace without side effects

### `apps/` — Web Frontend

- **Contains**: SvelteKit routes, pages, components, frontend stores
- **Style**: routing glue + UI — business logic lives in `packages/`
- **No**: domain logic, data transformation, direct database calls outside of SvelteKit server hooks
- **Rule**: an app route should delegate to a `packages/` function as soon as logic exceeds a few lines

### `services/` — HTTP Microservices

- **Contains**: Hono route definitions, middleware, OpenAPI schema, request/response wiring
- **Style**: routing only — handlers call `packages/` functions and return responses
- **No**: business logic, data transformation, anything that cannot be expressed as `request → package call → response`
- **Rule**: a service handler that contains `if` branches on business data is misplaced logic

### `cli/` — Command-Line Interfaces

- **Contains**: argument parsing, prompts, terminal output formatting, progress display
- **Style**: user interaction only — execution delegates to `packages/`
- **No**: business logic, HTTP calls, data transformation
- **Rule**: a CLI command should read its inputs, call a `packages/` function, and display the result
- **Internal layout**:
  - `src/bin/`: executable entry points only (`#!/usr/bin/env node`, runtime wiring, `process.exitCode`)
  - `src/commands/`: command definitions and orchestration from parsed options to package calls
  - `src/config/`: argument and environment parsing into typed configuration
  - `src/prompts/`: interactive questions and cancellation handling
  - `src/output/`: terminal, table, JSON, chart, and progress rendering
- **Extraction rule**: any function that remains useful without `process.argv`, `process.env`, prompts, terminal output, or `process.exit` belongs in `packages/`, not in `cli/`
- **Testing rule**: test CLI adapters by injecting dependencies and asserting parsed options, selected commands, output formatting, and error mapping; test domain decisions in `packages/`

### `ui/` — Shared Svelte Component Libraries

- **Contains**: reusable Svelte components, stores, and actions shared across `apps/`
- **Style**: declare `svelte` (and optionally `@sveltejs/kit`) as `peerDependencies` — business logic lives in `packages/`
- **No**: routing, server-side logic, CLI entry points, domain logic
- **Rule**: a `ui/` component that contains business logic should extract it to a `packages/` function

### `config/` — Shared Tooling Configuration

- **Contains**: ESLint presets, Prettier config, TypeScript base configs
- **No**: runtime code

### Static enforcement

All rules above are checked automatically by:

```bash
pnpm audit:structure
```

This script (`scripts/audit/workspace-structure.mjs`) runs as part of `pnpm ci:audit` and is enforced in CI.

### Adding a new exemption

If a check produces a false positive for a legitimate transitional state, add the package name to the appropriate allow-list at the top of `scripts/audit/workspace-structure.mjs`:

```js
// Packages temporarily exempt from CLI I/O source checks
const CLI_IO_MIGRATION_PENDING = new Set([
  "@univ-lehavre/atlas-citation-validate",
]);
```

Document the reason in a comment and open a tracking issue to remove the exemption once the migration is done.

## Questions?

- Open an [issue](https://github.com/univ-lehavre/atlas/issues) to report a bug
