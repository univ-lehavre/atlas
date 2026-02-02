# Technical Documentation

This section contains the technical documentation for Atlas intended for developers.

> **Are you a researcher?** Check out instead:
> - [Atlas Home](../) - General overview
> - [Atlas Verify Guide](/projects/citations/user/) - User documentation for researchers

## Overview

Atlas is a TypeScript monorepo using [Effect](https://effect.website/) for functional programming and error handling.

### Project Structure

```
atlas/
├── apps/
│   └── ecrin/              # SvelteKit Dashboard (Zero Trust)
├── packages/
│   ├── crf/                # REDCap client, server, CLI
│   ├── net/                # Network utilities
│   └── typescript-config/  # Shared TypeScript config
├── infra/                  # Kubernetes infrastructure
└── docs/                   # Documentation (this site)
```

### Tech Stack

| Area | Technologies |
|------|--------------|
| Runtime | Node.js 20+, TypeScript 5.x |
| Framework | Effect (functional programming) |
| Frontend | SvelteKit 2, Svelte 5 (runes) |
| Package manager | pnpm (workspaces) |
| Build | Vite, tsup |
| Test | Vitest |
| Lint | ESLint, Prettier |
| Kubernetes | k3d (dev), k3s (prod), Cilium, SPIRE, OPA |

## Documentation by Domain

### Atlas CRF (REDCap)

| Document | Description |
|----------|-------------|
| [Client and server](/projects/crf/) | REDCap integration with Effect |
| [CLI Tools](./cli.md) | Command line tools |

### Atlas Citations

| Document | Description |
|----------|-------------|
| [Overview](/projects/citations/dev/) | Package architecture |
| [Bibliographic sources](/projects/citations/dev/sources/) | Clients by source |
| [Atlas Verify](/projects/citations/dev/author-verification) | Verification system |

### Infrastructure

| Document | Description |
|----------|-------------|
| [General architecture](./architecture.md) | Effect patterns, ESLint, scripts |
| [Zero Trust infrastructure](./infrastructure.md) | Kubernetes, security |

### Audits

| Document | Description |
|----------|-------------|
| [Dependencies audit](/projects/atlas/dependencies-audit) | Inventory and update roadmap |

## Quick Start

### Installation

```bash
# Clone the repo
git clone https://github.com/univ-lehavre/atlas.git
cd atlas

# Install dependencies
pnpm install

# Start development
pnpm dev
```

### Main Commands

```bash
pnpm dev          # Development with hot-reload
pnpm build        # Build all packages
pnpm test         # Unit tests
pnpm lint         # Code verification
pnpm ready        # Complete pre-commit checks
```

### REDCap Configuration

```bash
# Environment variables
export REDCAP_API_URL=https://redcap.example.com/api/
export REDCAP_API_TOKEN=YOUR_32_CHAR_HEXADECIMAL_TOKEN

# Test the connection
pnpm -F @univ-lehavre/crf crf-redcap test
```

<RepoDynamics />

## Contributing

1. Create a branch from `main`
2. Make your changes
3. Run `pnpm ready` to verify
4. Create a Pull Request

See [CONTRIBUTING.md](https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md) for more details.
