# Atlas Monorepo

> Research platform for Le Havre Normandie University

Atlas is a TypeScript monorepo containing research tools including REDCap integrations (Effect-based), SvelteKit applications for expertise analysis, and shared utilities.

## Architecture

```
atlas/
├── packages/
│   ├── find-an-expert/     # SvelteKit - researcher expertise analysis
│   ├── amarre/             # SvelteKit - AMARRE project
│   ├── ecrin/              # SvelteKit - ECRIN project
│   ├── crf/                # REDCap client, server, CLI
│   ├── redcap-openapi/     # REDCap OpenAPI extraction
│   ├── redcap-core/        # REDCap domain logic (Effect)
│   ├── net/                # Network utilities
│   ├── shared-config/      # ESLint/TS/Prettier config
│   ├── appwrite/           # Appwrite utilities
│   ├── auth/               # Authentication service
│   ├── errors/             # Error classes
│   ├── validators/         # Validation utilities
│   └── logos/              # Brand assets
└── docs/                   # VitePress documentation
```

## Tech Stack

| Area | Technologies |
|------|--------------|
| Runtime | Node.js 24+, TypeScript 5.x |
| Framework | Effect, SvelteKit 2, Svelte 5 |
| Package manager | pnpm (workspaces) |
| Build | Vite, Turbo |
| Test | Vitest |
| Lint | ESLint, Prettier |

## Quick Start

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Test
pnpm test

# Full CI check
pnpm ci
```

## Audits

- [Dependency Audit](./dependencies-audit) - Security, licenses, versions, SPOF
- [Documentation](./documentation-audit) - Coverage, quality, updates
- [Technical Debt](./technical-debt) - Known issues and improvements
- [Audit Tools](./audit-tools) - Code quality, linting, and available audit commands
