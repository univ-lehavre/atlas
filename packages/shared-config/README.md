# @univ-lehavre/atlas-shared-config

Configuration partagée TypeScript, ESLint et Prettier pour les projets Atlas.

## À propos

Ce package centralise toutes les configurations de développement pour assurer la cohérence entre les packages du monorepo Atlas.

## Fonctionnalités

- **TypeScript** : Configurations strictes pour Node.js et bibliothèques
- **ESLint** : Presets pour TypeScript, Svelte et scripts internes
- **Prettier** : Formatage cohérent avec support Svelte

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

// Pour SvelteKit
import { svelte } from '@univ-lehavre/atlas-shared-config/prettier';
export default svelte;
```

## Presets ESLint

| Preset | Usage | Niveau |
|--------|-------|--------|
| `typescript` | Bibliothèques TypeScript | Strict |
| `svelte` | Applications SvelteKit | Strict |
| `scripts` | Tooling interne | Relaxé |

## Configuration TypeScript

| Config | Description |
|--------|-------------|
| `base.json` | Configuration stricte de base |
| `node.json` | Spécifique Node.js (extends base) |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-shared-config build   # Build
pnpm -F @univ-lehavre/atlas-shared-config lint    # ESLint
```

## Documentation

- [Documentation API](../../docs/api/@univ-lehavre/atlas-shared-config/)

## Organisation

Ce package fait partie d'**Atlas**, un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter la recherche et la collaboration entre chercheurs.

Atlas est développé dans le cadre de deux projets portés par l'Université Le Havre Normandie :

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)** : programme de recherche et de formation centré sur les enjeux maritimes et portuaires
- **[EUNICoast](https://eunicoast.eu/)** : alliance universitaire européenne regroupant des établissements situés sur les zones côtières européennes

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Université Le Havre Normandie" height="20">
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

## Licence

MIT
