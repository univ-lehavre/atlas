# Atlas CRF (REDCap)

Atlas CRF fournit un client TypeScript et un serveur HTTP pour interagir avec l'API REDCap.

> **Documentation utilisateur :** [Qu'est-ce qu'Atlas CRF ?](../#atlas-crf-clinical-research-forms)

## Packages

| Package | Description |
|---------|-------------|
| `@univ-lehavre/atlas-crf` | Client Effect + serveur Hono + CLI |

## Architecture

```
packages/crf/
├── specs/
│   └── redcap.yaml              # OpenAPI 3.1.0 spec REDCap
├── src/
│   ├── redcap/                  # Client Effect pour REDCap
│   │   ├── generated/types.ts   # Types générés (openapi-typescript)
│   │   ├── brands.ts            # Branded types (RecordId, etc.)
│   │   ├── client.ts            # Client principal
│   │   ├── errors.ts            # Erreurs typées
│   │   └── index.ts
│   ├── server/                  # Microservice HTTP (Hono)
│   │   ├── routes/              # health, project, records, users
│   │   ├── middleware/          # rate-limit, validation
│   │   └── index.ts
│   ├── cli/                     # CLI tools
│   │   ├── redcap/              # crf-redcap (test connectivité)
│   │   └── server/              # crf-server (test serveur CRF)
│   └── bin/                     # Entry points CLI
└── test/
```

## Client REDCap

### Installation

```bash
pnpm add @univ-lehavre/atlas-crf effect
```

### Usage basique

```typescript
import { Effect } from 'effect';
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-crf';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('YOUR_32_CHAR_HEXADECIMAL_TOKEN'),
});

// Exporter des records
const records = await Effect.runPromise(
  client.exportRecords({ fields: ['record_id', 'name'] })
);

// Informations du projet
const projectInfo = await Effect.runPromise(client.getProjectInfo());

// Liste des instruments
const instruments = await Effect.runPromise(client.listInstruments());
```

### Gestion des erreurs

```typescript
import { Effect, Match } from 'effect';
import { RedcapError, RedcapNetworkError, RedcapAuthError } from '@univ-lehavre/atlas-crf';

const program = client.exportRecords({ fields: ['record_id'] }).pipe(
  Effect.catchTag('RedcapAuthError', (error) => {
    console.error('Token invalide:', error.message);
    return Effect.succeed([]);
  }),
  Effect.catchTag('RedcapNetworkError', (error) => {
    console.error('Erreur réseau:', error.message);
    return Effect.succeed([]);
  })
);
```

### Branded Types

Le client utilise des branded types pour la validation à la compilation :

```typescript
import { RecordId, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-crf';

// Ces lignes échouent à la compilation si le format est invalide
const recordId = RecordId('123');                    // OK
const url = RedcapUrl('https://redcap.example.com/api/');  // OK
const token = RedcapToken('AAAABBBBCCCCDDDDEEEE11112222'); // 32 chars hex

// Erreur de compilation :
const badToken = RedcapToken('too-short');  // ❌ Type error
```

## Serveur HTTP

Le package inclut un serveur HTTP (Hono) qui expose l'API REDCap de manière REST.

### Lancement

```bash
# Variables d'environnement
export REDCAP_API_URL=https://redcap.example.com/api/
export REDCAP_API_TOKEN=your_token

# Lancer le serveur
pnpm -F @univ-lehavre/atlas-crf start
```

### Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | Santé du service |
| GET | `/project` | Informations du projet |
| GET | `/records` | Exporter les records |
| POST | `/records` | Importer des records |
| GET | `/users` | Liste des utilisateurs |

### Middleware

- **Rate Limiting** : Protection contre les abus
- **Validation** : Validation des paramètres d'entrée

## CLI

### crf-redcap

Test de connectivité avec l'API REDCap :

```bash
# Test basique
crf-redcap test

# Avec configuration personnalisée
REDCAP_API_URL=https://redcap.example.com/api/ \
REDCAP_API_TOKEN=AAAABBBBCCCCDDDDEEEE11112222 \
crf-redcap test

# Sortie JSON
crf-redcap test --json
```

Tests exécutés :
1. Version REDCap
2. Informations projet
3. Liste des instruments
4. Liste des champs
5. Export d'un échantillon de records

### crf-server

Test du serveur CRF :

```bash
crf-server test
```

## Génération des types

Les types TypeScript sont générés depuis la spec OpenAPI :

```bash
pnpm -F @univ-lehavre/atlas-crf generate:types
```

Cela génère `src/redcap/generated/types.ts` depuis `specs/redcap.yaml`.

## Adaptateurs de version

Le client supporte différentes versions de REDCap via des adaptateurs :

```typescript
// Les adaptateurs gèrent les différences d'API entre versions
import { createRedcapClient } from '@univ-lehavre/atlas-crf';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('...'),
  version: '14.5.10',  // Optionnel, détecté automatiquement
});
```

## Voir aussi

- [Outils CLI](./cli.md) - Documentation complète des CLI
- [Architecture](./architecture.md) - Patterns Effect et ESLint
