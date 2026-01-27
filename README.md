# Atlas

[![DOI](https://zenodo.org/badge/1137569222.svg)](https://doi.org/10.5281/zenodo.18310357)

Atlas est un monorepo TypeScript pour la recherche, incluant des outils [REDCap](https://www.project-redcap.org/) (Effect) et une application d'analyse d'expertise des chercheurs.

## Packages

### Applications

| Package                                   | Description                                    |
| ----------------------------------------- | ---------------------------------------------- |
| [find-an-expert](packages/find-an-expert) | App SvelteKit - analyse expertise chercheurs   |

### Librairies

| Package                                               | Description                         | npm                                                                                                                                 |
| ----------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [@univ-lehavre/atlas-redcap-api](packages/redcap-api) | Client TypeScript pour l'API REDCap | [![npm](https://img.shields.io/npm/v/@univ-lehavre/atlas-redcap-api)](https://www.npmjs.com/package/@univ-lehavre/atlas-redcap-api) |
| [@univ-lehavre/atlas-net](packages/net)               | Utilitaires de diagnostic reseau    | -                                                                                                                                   |

### Configuration partagee

| Package                                               | Description                       |
| ----------------------------------------------------- | --------------------------------- |
| [@univ-lehavre/atlas-shared-config](packages/shared-config) | Configuration ESLint, TypeScript, Prettier partagee |

## Documentation

- [Guide de demarrage](https://univ-lehavre.github.io/atlas/guide/)
- [Reference API](https://univ-lehavre.github.io/atlas/api/)

## Demarrage rapide

### Utiliser le client API

```bash
pnpm add @univ-lehavre/atlas-redcap-api effect
```

```typescript
import { Effect } from 'effect';
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('YOUR_32_CHAR_HEXADECIMAL_TOKEN'),
});

const records = await Effect.runPromise(client.exportRecords({ fields: ['record_id', 'name'] }));
```

## Developpement

```bash
# Installation
pnpm install

# Developpement
pnpm dev

# Tests
pnpm test

# Verifications pre-release
pnpm ready
```

## Licence

[MIT](LICENSE)
