# @univ-lehavre/atlas-redcap-openapi

Analyse du code source REDCap, extraction de spécifications OpenAPI et outils de documentation API.

## À propos

Ce package permet d'analyser le code source PHP de REDCap pour en extraire automatiquement des spécifications OpenAPI. Il fournit également des outils de comparaison entre versions et un serveur de documentation.

## Fonctionnalités

- **Extracteur** : Génération de specs OpenAPI depuis le code PHP REDCap
- **Comparateur** : Comparaison de specs entre versions
- **Serveur** : Documentation API avec Swagger UI et Redoc
- **CLI** : Interface interactive avec `@clack/prompts`

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-openapi
```

## Usage

### CLI interactif

```bash
pnpm -F @univ-lehavre/atlas-redcap-openapi cli
```

### Commandes directes

```bash
pnpm -F @univ-lehavre/atlas-redcap-openapi extract  # Extraire spec OpenAPI
pnpm -F @univ-lehavre/atlas-redcap-openapi compare  # Comparer versions
pnpm -F @univ-lehavre/atlas-redcap-openapi docs     # Serveur documentation
```

### Usage programmatique

```typescript
import { extract, compare, serve } from '@univ-lehavre/atlas-redcap-openapi';

// Extraire une spec OpenAPI depuis le code source REDCap
const result = extract({
  version: '14.5.10',
  sourcePath: './upstream/versions',
  outputPath: './specs/versions/redcap-14.5.10.yaml',
});

// Comparer deux versions
const diff = compare({
  oldSpecPath: './specs/versions/redcap-14.5.10.yaml',
  newSpecPath: './specs/versions/redcap-14.6.0.yaml',
});

// Servir la documentation
serve({
  specPath: './specs/versions/redcap-14.5.10.yaml',
  port: 3000,
});
```

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-redcap-openapi dev      # Développement
pnpm -F @univ-lehavre/atlas-redcap-openapi build    # Build
pnpm -F @univ-lehavre/atlas-redcap-openapi test     # Tests
pnpm -F @univ-lehavre/atlas-redcap-openapi lint     # ESLint
```

## Exports

| Export | Description |
|--------|-------------|
| `.` | Tous les modules |
| `./extractor` | Extraction OpenAPI depuis PHP |
| `./comparator` | Utilitaires de comparaison |
| `./server` | Serveur de documentation |

## Documentation

- [Documentation API](../../docs/api/@univ-lehavre/atlas-redcap-openapi/)

## Organisation

Ce package fait partie d'**Atlas**, un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter la recherche et la collaboration entre chercheurs.

Atlas est développé dans le cadre de deux projets portés par l'Université Le Havre Normandie :

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)** : programme de recherche et de formation centré sur les enjeux maritimes et portuaires
- **[EUNICoast](https://eunicoast.eu/)** : alliance universitaire européenne regroupant des établissements situés sur les zones côtières européennes

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Université Le Havre Normandie" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="../logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="../logos/eunicoast.png" alt="EUNICoast" height="50">
  </a>
</p>

## Licence

MIT

Le code source REDCap est propriétaire et n'est PAS inclus dans ce dépôt.
