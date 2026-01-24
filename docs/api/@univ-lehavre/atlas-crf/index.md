# @univ-lehavre/crf

Clinical Research Forms - Package unifié pour interagir avec l'API REDCap.

## Architecture

Ce package utilise une architecture **OpenAPI-first** :

```
packages/crf/
├── specs/redcap.yaml          # Source de vérité (OpenAPI 3.1.0)
├── src/redcap/                # Client Effect pour REDCap
│   ├── generated/types.ts     # Types générés depuis la spec
│   ├── brands.ts              # Branded types (RecordId, etc.)
│   ├── client.ts              # Client principal
│   └── errors.ts              # Erreurs typées
├── src/server/                # Microservice HTTP REST (Hono)
│   ├── routes/                # health, project, records, users
│   └── middleware/            # rate-limit, validation
└── src/cli/                   # CLI tools
```

## Installation

```bash
pnpm add @univ-lehavre/crf
```

## Usage

### Client REDCap

```typescript
import { createRedcapClient, RedcapUrl, RedcapToken, RecordId } from '@univ-lehavre/crf/redcap';
import { Effect } from 'effect';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
});

// Obtenir la version REDCap
const version = await Effect.runPromise(client.getVersion());
console.log('REDCap version:', version);

// Exporter des records
const records = await Effect.runPromise(
  client.exportRecords({
    fields: ['record_id', 'first_name', 'last_name'],
    filterLogic: '[age] >= 18',
  })
);
```

### Serveur CRF

```bash
# Variables d'environnement requises
export REDCAP_API_URL=https://redcap.example.com/api/
export REDCAP_API_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
export PORT=3000

# Lancer le serveur
pnpm -F @univ-lehavre/crf start
```

Le serveur expose :

- `GET /health` - Health check
- `GET /api/v1/project/version` - Version REDCap
- `GET /api/v1/project/info` - Informations projet
- `GET /api/v1/records` - Exporter les records
- `POST /api/v1/records` - Importer des records
- `GET /api/v1/users/:email` - Trouver un utilisateur par email
- `GET /openapi.json` - Spécification OpenAPI
- `GET /docs` - Documentation Scalar

## Scripts

```bash
# Régénérer les types depuis la spec OpenAPI
pnpm generate:types

# Lancer un mock REDCap (Prism)
pnpm mock:redcap

# Lancer le serveur CRF
pnpm start

# Tests unitaires
pnpm test

# Tests API (nécessite serveur en cours)
pnpm test:api
```

## Développement

### Workflow OpenAPI-first

1. Modifier `specs/redcap.yaml` (source de vérité)
2. Valider : `pnpm spectral lint specs/redcap.yaml`
3. Régénérer les types : `pnpm generate:types`
4. Adapter le code client/serveur si nécessaire

### Tests avec Prism

```bash
# Terminal 1: Lancer le mock REDCap
pnpm mock:redcap

# Terminal 2: Tester le client
REDCAP_API_URL=http://localhost:8080/api/ \
REDCAP_API_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA \
pnpm crf-redcap test
```

### Tests API avec Schemathesis

```bash
# Terminal 1: Mock REDCap
pnpm mock:redcap

# Terminal 2: Serveur CRF
REDCAP_API_URL=http://localhost:8080/api/ \
REDCAP_API_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA \
pnpm start

# Terminal 3: Tests Schemathesis
pnpm test:api
```

## Branded Types

Le package utilise des **branded types** pour la validation runtime :

```typescript
import { RedcapToken, RecordId, InstrumentName, Email } from '@univ-lehavre/crf/redcap';

// Ces appels valident le format
const token = RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'); // OK
const recordId = RecordId('abc12345678901234567'); // OK (20+ chars alphanumériques)

// Ces appels lèvent une exception
const badToken = RedcapToken('invalid'); // Error: token invalide
const badId = RecordId('short'); // Error: doit avoir au moins 20 caractères
```

## Licence

MIT

## Modules

| Module | Description |
| ------ | ------ |
| [crf](crf/index.md) | - |
| [redcap](redcap/index.md) | - |
| [server](server/index.md) | CRF Server - HTTP microservice for REDCap. |
