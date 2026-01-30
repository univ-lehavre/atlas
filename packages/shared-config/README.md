# @univ-lehavre/atlas-shared-config

Shared TypeScript, ESLint, and Prettier configuration for Atlas projects.

## About

This package centralizes all development configurations to ensure consistency across packages in the Atlas monorepo.

## Features

- **TypeScript**: Strict configurations for Node.js and libraries
- **ESLint**: Presets for TypeScript, Svelte, and internal scripts
- **Prettier**: Consistent formatting with Svelte support

## Installation

```bash
pnpm add -D @univ-lehavre/atlas-shared-config
```

## Usage

### TypeScript

```json
// tsconfig.json
{
  "extends": "@univ-lehavre/atlas-shared-config/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### ESLint

```javascript
// eslint.config.js
import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default typescript({
  ignores: ['**/generated/**'],
  workspaceModules: ['@univ-lehavre/atlas-net'],
});
```

### Prettier

```javascript
// prettier.config.js
import { base } from '@univ-lehavre/atlas-shared-config/prettier';
export default base;

// For SvelteKit
import { svelte } from '@univ-lehavre/atlas-shared-config/prettier';
export default svelte;
```

## ESLint Presets

| Preset | Usage | Level |
|--------|-------|-------|
| `typescript` | TypeScript libraries | Strict |
| `svelte` | SvelteKit applications | Strict |
| `scripts` | Internal tooling | Relaxed |

## TypeScript Configuration

| Config | Description |
|--------|-------------|
| `base.json` | Strict base configuration |
| `node.json` | Node.js specific (extends base) |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-shared-config build   # Build
pnpm -F @univ-lehavre/atlas-shared-config lint    # ESLint
```

## Documentation

- [API Documentation](../../docs/api/@univ-lehavre/atlas-shared-config/)

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
