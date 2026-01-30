# @univ-lehavre/atlas-redcap-core

Pure and functional REDCap business logic with Effect.

## About

This package provides shared types, utilities, and pure functions for REDCap integration. It is designed to be imported by other packages requiring REDCap functionality.

## Features

- **Branded types**: Typed identifiers (RecordId, ProjectId, etc.)
- **Error handling**: REDCap error types with Effect
- **Version detection**: REDCap version parsing and comparison
- **Content types**: REDCap API content type definitions
- **Validation**: Input validation utilities
- **Adapters**: Version-specific API adapters

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-core effect
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
| `/brands` | Branded types for typed identifiers |
| `/errors` | REDCap error types |
| `/version` | Version parsing and comparison |
| `/content-types` | API content type definitions |
| `/params` | Request parameter types |
| `/adapters` | Version-specific adapters |
| `/validation` | Validation utilities |
| `/utils` | General utilities |
| `/types` | Shared type definitions |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-redcap-core dev        # Development
pnpm -F @univ-lehavre/atlas-redcap-core build      # Build
pnpm -F @univ-lehavre/atlas-redcap-core test       # Tests
pnpm -F @univ-lehavre/atlas-redcap-core typecheck  # Type checking
pnpm -F @univ-lehavre/atlas-redcap-core lint       # ESLint
```

## Documentation

- [API Documentation](../../docs/api/@univ-lehavre/atlas-redcap-core/)

## Organization

This package is part of **Atlas**, a set of tools developed by **Le Havre Normandie University** to facilitate research and collaboration between researchers.

Atlas is developed as part of two projects led by Le Havre Normandie University:

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)**: research and training program focused on maritime and port issues
- **[EUNICoast](https://eunicoast.eu/)**: European university alliance bringing together institutions located in European coastal areas

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Le Havre Normandie University" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="../logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="../logos/eunicoast.png" alt="EUNICoast" height="20">
  </a>
</p>

## License

MIT
