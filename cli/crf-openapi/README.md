# @univ-lehavre/atlas-crf-openapi

Outils CLI et bibliothèque pour extraire, comparer et servir des spécifications OpenAPI REDCap.

L’éditeur REDCap a donné son consentement à la publication de ce projet, qui est développé de manière indépendante et n’est pas affilié à REDCap ou à son éditeur, voir le [thread](https://redcap.vumc.org/community/post.php?id=270962&comment=277860) du forum de la communauté REDCap.

## About

Ce package analyse le code source PHP de REDCap pour produire des spécifications OpenAPI, comparer des versions et détecter les changements d'API. Il expose aussi un serveur de documentation et une CLI `redcap` avec commandes `extract`, `compare` et `docs`.

## Features

- **Extractor**: Generate OpenAPI specs from REDCap PHP code
- **Comparator**: Compare specs between versions
- **Server**: API documentation with Swagger UI and Redoc
- **CLI**: Interactive interface with `@clack/prompts`

## Installation

```bash
pnpm add @univ-lehavre/atlas-crf-openapi
```

## Usage

### Interactive CLI

```bash
pnpm -F @univ-lehavre/atlas-crf-openapi cli
```

### Direct Commands

```bash
pnpm -F @univ-lehavre/atlas-crf-openapi extract  # Extract OpenAPI spec
pnpm -F @univ-lehavre/atlas-crf-openapi compare  # Compare versions
pnpm -F @univ-lehavre/atlas-crf-openapi docs     # Documentation server
```

### Programmatic Usage

```typescript
import { extract, compare, serve } from '@univ-lehavre/atlas-crf-openapi';

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
pnpm -F @univ-lehavre/atlas-crf-openapi dev      # Development
pnpm -F @univ-lehavre/atlas-crf-openapi build    # Build
pnpm -F @univ-lehavre/atlas-crf-openapi test     # Tests
pnpm -F @univ-lehavre/atlas-crf-openapi lint     # ESLint
```

## Exports

| Export         | Description                 |
| -------------- | --------------------------- |
| `.`            | All modules                 |
| `./extractor`  | OpenAPI extraction from PHP |
| `./comparator` | Comparison utilities        |
| `./server`     | Documentation server        |

## Documentation

## Organization

This package is part of **Atlas**, a set of tools developed by **Le Havre Normandie University** to facilitate research and collaboration between researchers.

Atlas is developed as part of two projects led by Le Havre Normandie University:

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)**: research and training program focused on maritime and port issues
- **[EUNICoast](https://eunicoast.eu/)**: European university alliance bringing together institutions located in European coastal areas

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="https://raw.githubusercontent.com/univ-lehavre/atlas/main/assets/logos/ulhn.svg" alt="Le Havre Normandie University" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="https://raw.githubusercontent.com/univ-lehavre/atlas/main/assets/logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="https://raw.githubusercontent.com/univ-lehavre/atlas/main/assets/logos/eunicoast.png" alt="EUNICoast" height="20">
  </a>
</p>

## License

MIT

REDCap source code is proprietary and is NOT included in this repository.
