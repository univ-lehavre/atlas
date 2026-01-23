# Atlas

[![DOI](https://zenodo.org/badge/1137569222.svg)](https://doi.org/10.5281/zenodo.18310357)

Atlas est un ensemble d'outils TypeScript pour interagir avec l'API [REDCap](https://www.project-redcap.org/), construits avec [Effect](https://effect.website/).

## Architecture

```
                              ┌─────────────────────────────────────────┐
                              │           Environnement Local           │
                              │              (k3d + Cilium)             │
                              └─────────────────────────────────────────┘
                                                  │
                                         localhost:8080
                                                  │
                              ┌───────────────────▼───────────────────┐
                              │          Cilium Ingress               │
                              │         (forward-auth)                │
                              └───────────────────┬───────────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
               /authelia/*                   /* (protege)               (non expose)
                    │                             │                             │
          ┌─────────▼─────────┐        ┌─────────▼─────────┐        ┌──────────▼──────────┐
          │     Authelia      │        │       ecrin       │        │   redcap-service    │
          │   Magic Links     │        │   Dashboard       │  mTLS  │   API REDCap        │
          │   Domain-based    │        │   SvelteKit       │◄──────►│   Effect            │
          └─────────┬─────────┘        └─────────┬─────────┘        └──────────┬──────────┘
                    │                             │                             │
          ┌─────────▼─────────┐        ┌─────────▼─────────┐                   │
          │     MailHog       │        │       OPA         │                   │
          │   (dev emails)    │        │   RBAC/ABAC       │                   │
          └───────────────────┘        └───────────────────┘                   │
                                                                               │
                                                                      ┌────────▼────────┐
                                                                      │  REDCap externe │
                                                                      └─────────────────┘
```

## Packages

### Applications

| Package                                               | Description                        | npm                                                                                                                                         |
| ----------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [ecrin](apps/ecrin)                                   | Dashboard SvelteKit Zero Trust     | -                                                                                                                                           |
| [@univ-lehavre/atlas-redcap-service](services/redcap) | Microservice HTTP REST pour REDCap | [![npm](https://img.shields.io/npm/v/@univ-lehavre/atlas-redcap-service)](https://www.npmjs.com/package/@univ-lehavre/atlas-redcap-service) |

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
- [Infrastructure Zero Trust](infra/README.md)

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

### Demarrer l'environnement local Zero Trust

```bash
# Prerequis (macOS)
brew install k3d kubectl helm cilium-cli

# Demarrer
./infra/scripts/setup.sh

# URLs
# - Dashboard:  http://localhost:8080
# - MailHog:    http://localhost:8025
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

## Architecture Zero Trust

L'environnement local implemente une architecture Zero Trust complete :

| Composant        | Role                                              |
| ---------------- | ------------------------------------------------- |
| **k3d**          | Cluster k3s dans Docker                           |
| **Cilium**       | CNI + Ingress + Network Policies + mTLS           |
| **SPIRE**        | Workload identity + certificats automatiques      |
| **Authelia**     | Authentification (magic links, domaine restreint) |
| **OPA**          | Autorisation RBAC/ABAC (Rego policies)            |
| **Loki/Grafana** | Audit logs + observabilite                        |

### Principes appliques

- **Never trust, always verify** : Chaque requete verifiee par Authelia + OPA
- **Least privilege** : RBAC/ABAC, acces minimal par defaut
- **Assume breach** : mTLS partout, isolation reseau, audit logs
- **Micro-segmentation** : Cilium Network Policies strictes
- **Encrypt everywhere** : mTLS interne (SPIRE)

Voir [infra/README.md](infra/README.md) pour la documentation complete.

## Licence

[MIT](LICENSE)
