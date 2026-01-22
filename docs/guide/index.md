# Getting Started

## Installation

### Client API

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

### Microservice

```bash
pnpm add @univ-lehavre/atlas-redcap-service
```

## Configuration

Creez un fichier `.env` dans `apps/redcap-service/` :

```bash
cp apps/redcap-service/.env.example apps/redcap-service/.env
```

Configurez les variables :

```env
PORT=3000
REDCAP_API_URL=https://redcap.example.com/api/
REDCAP_API_TOKEN=your_token_here
```

## Developpement

```bash
# Installation des dependances
pnpm install

# Developpement avec hot-reload
pnpm dev

# Build
pnpm build

# Tests
pnpm test

# Verifications pre-release
pnpm ready
```

## Structure du projet

```
atlas/
├── apps/
│   └── redcap-service/     # Microservice HTTP REST
├── cli/
│   ├── redcap/             # CLI pour tester REDCap
│   └── net/                # CLI pour diagnostics reseau
├── packages/
│   ├── redcap-api/         # Client API REDCap
│   ├── net/                # Utilitaires reseau
│   ├── eslint-config/      # Configuration ESLint partagee
│   └── typescript-config/  # Configuration TypeScript partagee
└── docs/                   # Documentation (ce site)
```
