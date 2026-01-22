# Atlas

[![DOI](https://zenodo.org/badge/1137569222.svg)](https://doi.org/10.5281/zenodo.18310357)

Atlas est un ensemble d'outils TypeScript pour interagir avec l'API [REDCap](https://www.project-redcap.org/), construits avec [Effect](https://effect.website/).

## Packages

### Applications

| Package                                                   | Description                        | npm                                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [@univ-lehavre/atlas-redcap-service](apps/redcap-service) | Microservice HTTP REST pour REDCap | [![npm](https://img.shields.io/npm/v/@univ-lehavre/atlas-redcap-service)](https://www.npmjs.com/package/@univ-lehavre/atlas-redcap-service) |

### Librairies

| Package                                               | Description                         | npm                                                                                                                                 |
| ----------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [@univ-lehavre/atlas-redcap-api](packages/redcap-api) | Client TypeScript pour l'API REDCap | [![npm](https://img.shields.io/npm/v/@univ-lehavre/atlas-redcap-api)](https://www.npmjs.com/package/@univ-lehavre/atlas-redcap-api) |
| [@univ-lehavre/atlas-net](packages/net)               | Utilitaires de diagnostic reseau    | -                                                                                                                                   |

### CLI

| Package                                      | Description                                 |
| -------------------------------------------- | ------------------------------------------- |
| [@univ-lehavre/atlas-redcap-cli](cli/redcap) | CLI pour tester la connectivite REDCap      |
| [@univ-lehavre/atlas-net-cli](cli/net)       | CLI pour diagnostiquer les problemes reseau |

### Configuration partagee

| Package                                                             | Description                       |
| ------------------------------------------------------------------- | --------------------------------- |
| [@univ-lehavre/atlas-eslint-config](packages/eslint-config)         | Configuration ESLint partagee     |
| [@univ-lehavre/atlas-typescript-config](packages/typescript-config) | Configuration TypeScript partagee |

## Documentation

- [Guide de demarrage](https://univ-lehavre.github.io/atlas/guide/)
- [Reference API](https://univ-lehavre.github.io/atlas/api/)

## Demarrage rapide

```bash
# Installer le client API
pnpm add @univ-lehavre/atlas-redcap-api effect

# Ou le microservice
pnpm add @univ-lehavre/atlas-redcap-service
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
