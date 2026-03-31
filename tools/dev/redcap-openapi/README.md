# @univ-lehavre/atlas-redcap-openapi

REDCap source code analysis, OpenAPI specification extraction, and API documentation tools.

## About

This package enables analyzing REDCap PHP source code to automatically extract OpenAPI specifications. It also provides version comparison tools and a documentation server.

## Features

- **Extractor**: Generate OpenAPI specs from REDCap PHP code
- **Comparator**: Compare specs between versions
- **Server**: API documentation with Swagger UI and Redoc
- **CLI**: Interactive interface with `@clack/prompts`

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-openapi
```

## Usage

### Interactive CLI

```bash
pnpm -F @univ-lehavre/atlas-redcap-openapi cli
```

### Direct Commands

```bash
pnpm -F @univ-lehavre/atlas-redcap-openapi extract  # Extract OpenAPI spec
pnpm -F @univ-lehavre/atlas-redcap-openapi compare  # Compare versions
pnpm -F @univ-lehavre/atlas-redcap-openapi docs     # Documentation server
```

### Programmatic Usage

```typescript
import { extract, compare, serve } from '@univ-lehavre/atlas-redcap-openapi';

// Extract an OpenAPI spec from REDCap source code
const result = extract({
  version: '14.5.10',
  sourcePath: './upstream/versions',
  outputPath: './specs/versions/redcap-14.5.10.yaml',
});

// Compare two versions
const diff = compare({
  oldSpecPath: './specs/versions/redcap-14.5.10.yaml',
  newSpecPath: './specs/versions/redcap-14.6.0.yaml',
});

// Serve the documentation
serve({
  specPath: './specs/versions/redcap-14.5.10.yaml',
  port: 3000,
});
```

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-redcap-openapi dev      # Development
pnpm -F @univ-lehavre/atlas-redcap-openapi build    # Build
pnpm -F @univ-lehavre/atlas-redcap-openapi test     # Tests
pnpm -F @univ-lehavre/atlas-redcap-openapi lint     # ESLint
```

## Exports

| Export | Description |
|--------|-------------|
| `.` | All modules |
| `./extractor` | OpenAPI extraction from PHP |
| `./comparator` | Comparison utilities |
| `./server` | Documentation server |

## Documentation

- [API Documentation](../../docs/api/@univ-lehavre/atlas-redcap-openapi/)

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

REDCap source code is proprietary and is NOT included in this repository.
