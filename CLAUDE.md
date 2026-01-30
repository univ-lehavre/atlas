# CLAUDE.md - Instructions for Claude Code

This file provides the necessary context for working effectively on this project.

## Project Overview

**Atlas** is a TypeScript monorepo for research, including REDCap tools (Effect) and an expertise analysis application.

### Architecture

```
atlas/
├── packages/
│   ├── find-an-expert/     # SvelteKit app - researcher expertise analysis
│   ├── crf/                # Case Report Form (REDCap client, server, CLI)
│   ├── redcap-openapi/     # REDCap source analysis and OpenAPI extraction
│   ├── net/                # Network utilities and diagnostic CLI
│   └── shared-config/      # Shared TypeScript and ESLint config
└── docs/                   # VitePress documentation
```

### Tech Stack

| Area            | Technologies                              |
| --------------- | ----------------------------------------- |
| Runtime         | Node.js 24+, TypeScript 5.x               |
| Framework       | Effect, SvelteKit 2, Svelte 5             |
| Package manager | pnpm (workspaces)                         |
| Build           | Vite, tsup                                |
| Test            | Vitest                                    |
| Lint            | ESLint, Prettier (@univ-lehavre/shared-config) |

## Essential Commands

```bash
# Installation
pnpm install

# Development
pnpm dev                       # All packages in watch mode
pnpm -F find-an-expert dev     # Find an Expert (SvelteKit)
pnpm -F @univ-lehavre/crf dev  # CRF

# Build
pnpm build                     # All packages

# Tests
pnpm test                      # All tests

# Lint
pnpm lint                      # ESLint
pnpm format                    # Prettier

# Pre-commit checks
pnpm ready                     # lint + test + build
```

## Code Conventions

### TypeScript / Effect

- Use Effect for all async/error logic
- Strict typing (`strict: true`)
- No `any`, prefer `unknown` if necessary
- Document with TSDoc

````typescript
/**
 * Exports records from REDCap.
 *
 * @param options - Export options
 * @returns Effect containing records or a REDCap error
 *
 * @example
 * ```typescript
 * const records = yield* client.exportRecords({ fields: ['record_id'] });
 * ```
 */
export const exportRecords = (options: ExportOptions): Effect.Effect<Record[], RedcapError> => {
  // ...
};
````

### Commits

Conventional format:

```
type(scope): description

- feat: new feature
- fix: bug fix
- docs: documentation
- refactor: refactoring
- test: add/modify tests
- chore: maintenance
```

Examples:

```
feat(crf): add exportRecords method
docs: update contributing guide
```

## Package Structure

### packages/find-an-expert

SvelteKit application for discovering and analyzing researcher expertise via OpenAlex and GitHub.

| Stack     | Technologies                        |
| --------- | ----------------------------------- |
| Frontend  | SvelteKit 2, Svelte 5, Tailwind CSS |
| Backend   | Appwrite                            |
| APIs      | OpenAlex, GitHub                    |

```
packages/find-an-expert/
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── server/         # Services (auth, openalex, github, git-stats)
│   │   ├── stores/         # Svelte runes ($state)
│   │   └── ui/             # Reusable UI components
│   └── routes/
│       ├── api/v1/         # REST API (auth, health, repositories, institutions)
│       ├── dashboard/      # Dashboard (protected)
│       └── login/          # Authentication
├── static/                 # Assets (partner logos)
└── docs/ -> docs/guide/find-an-expert/
```

Scripts:

- `pnpm -F find-an-expert dev` - Development
- `pnpm -F find-an-expert build` - Production build
- `pnpm -F find-an-expert test` - Vitest tests

Svelte 5 conventions:

- Use runes (`$state`, `$derived`, `$effect`, `$props`)
- No Svelte 4 stores
- Never use `fetch('/api/...')` server-side, use `$lib/server/*` services instead

### packages/crf (Case Report Form)

Unified package containing the REDCap client, HTTP server, and CLIs.
OpenAPI-first architecture with types generated from `specs/redcap.yaml`.

```
packages/crf/
├── specs/
│   └── redcap.yaml              # REDCap OpenAPI 3.1.0 spec
├── src/
│   ├── redcap/                  # Effect client for REDCap
│   │   ├── generated/types.ts   # Generated types (openapi-typescript)
│   │   ├── brands.ts            # Branded types (RecordId, etc.)
│   │   ├── client.ts            # Main client
│   │   ├── errors.ts            # Typed errors
│   │   └── index.ts             # Exports
│   ├── server/                  # HTTP microservice (Hono)
│   │   ├── routes/              # health, project, records, users
│   │   ├── middleware/          # rate-limit, validation
│   │   └── index.ts             # Hono app + serve
│   ├── cli/                     # CLI tools
│   │   ├── redcap/              # crf-redcap (connectivity test)
│   │   └── server/              # crf-server (CRF server test)
│   └── bin/                     # CLI entry points
├── test/
└── package.json
```

CRF Scripts:

- `pnpm -F @univ-lehavre/crf generate:types` - Regenerate types from OpenAPI
- `pnpm -F @univ-lehavre/crf mock:redcap` - Start Prism (REDCap mock)
- `pnpm -F @univ-lehavre/crf start` - Start CRF server
- `pnpm -F @univ-lehavre/crf test:api` - Schemathesis tests against the API

### packages/redcap-openapi (REDCap Source Analysis)

Tools for analyzing REDCap PHP source code to extract OpenAPI specifications.
Unified CLI with `@clack/prompts` for an interactive experience.

```
packages/redcap-openapi/
├── src/
│   ├── extractor/          # OpenAPI extraction from PHP
│   ├── comparator/         # Spec comparison
│   ├── server/             # Docs server (Swagger UI, Redoc)
│   ├── cli/                # Unified CLI
│   └── index.ts            # Public exports
├── specs/versions/         # Generated specs by version
├── upstream/versions/      # PHP sources (gitignored)
├── dev/                    # Development environment
│   ├── docker/             # Docker compose + config
│   ├── scripts/            # Automation scripts
│   └── tests/              # Contract tests
└── package.json
```

REDCap Scripts:

- `pnpm -F @univ-lehavre/atlas-redcap-openapi cli` - Interactive CLI
- `pnpm -F @univ-lehavre/atlas-redcap-openapi extract` - Extract OpenAPI spec
- `pnpm -F @univ-lehavre/atlas-redcap-openapi compare` - Compare versions
- `pnpm -F @univ-lehavre/atlas-redcap-openapi docs` - Documentation server

### Adding a method to the REDCap client

```typescript
// packages/crf/src/redcap/client.ts
import { Effect } from 'effect';
import type { components } from './generated/types.js';
import { RedcapError } from './errors.js';

// Use types generated from the OpenAPI spec
type ProjectInfo = components['schemas']['ProjectInfo'];

export const getProjectInfo = (config: RedcapConfig): Effect.Effect<ProjectInfo, RedcapError> => {
  return Effect.gen(function* () {
    const response = yield* makeRequest(config, {
      content: 'project',
    });
    return response as ProjectInfo;
  });
};
```

## What NOT to Do

- Do not commit real secrets
- Do not use `any` in TypeScript
