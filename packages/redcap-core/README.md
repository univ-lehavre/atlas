# @univ-lehavre/atlas-redcap-core

Pure functional core for REDCap domain logic with Effect.

## Description

This package provides shared types, utilities, and pure functions for REDCap integration. It is designed to be imported by other packages that need REDCap functionality.

## Features

- **Branded types** - Type-safe identifiers (RecordId, ProjectId, etc.)
- **Error handling** - REDCap-specific error types with Effect
- **Version detection** - REDCap version parsing and comparison
- **Content types** - REDCap API content type definitions
- **Validation** - Input validation utilities
- **Adapters** - Version-specific API adapters

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-core
```

## Usage

```typescript
import { RecordId, ProjectId } from '@univ-lehavre/atlas-redcap-core/brands';
import { RedcapError } from '@univ-lehavre/atlas-redcap-core/errors';
import { parseVersion } from '@univ-lehavre/atlas-redcap-core/version';
```

## Exports

| Export | Description |
|--------|-------------|
| `/brands` | Branded types for type-safe identifiers |
| `/errors` | REDCap-specific error types |
| `/version` | Version parsing and comparison |
| `/content-types` | API content type definitions |
| `/params` | Request parameter types |
| `/adapters` | Version-specific adapters |
| `/validation` | Input validation utilities |
| `/utils` | General utilities |
| `/types` | Shared type definitions |

## Development

```bash
# Build
pnpm build

# Type check
pnpm typecheck

# Run tests
pnpm test

# Lint
pnpm lint
```
