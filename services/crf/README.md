# @univ-lehavre/crf

Case Report Form - Unified package for interacting with the REDCap API.

## About

This package provides a typed TypeScript client for the REDCap API, an HTTP REST server, and CLI tools. It uses an OpenAPI-first architecture with types generated from the `specs/redcap.yaml` specification.

## Features

- **REDCap Client**: Typed Effect client for the REDCap API
- **HTTP Server**: REST microservice with Hono
- **CLI**: Command-line tools for testing connectivity
- **Generated Types**: TypeScript types generated from OpenAPI
- **Branded Types**: Runtime validation of identifiers

## Installation

```bash
pnpm add @univ-lehavre/crf effect
```

## Usage

### REDCap Client

```typescript
import { createRedcapClient, RedcapUrl, RedcapToken, RecordId } from '@univ-lehavre/crf/redcap';
import { Effect } from 'effect';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
});

// Get REDCap version
const version = await Effect.runPromise(client.getVersion());
console.log('REDCap version:', version);

// Export records
const records = await Effect.runPromise(
  client.exportRecords({
    fields: ['record_id', 'first_name', 'last_name'],
    filterLogic: '[age] >= 18',
  })
);
```

### CRF Server

```bash
# Required environment variables
export REDCAP_API_URL=https://redcap.example.com/api/
export REDCAP_API_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
export PORT=3000

# Start the server
pnpm -F @univ-lehavre/crf start
```

## Server API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/v1/project/version` | REDCap version |
| `GET /api/v1/project/info` | Project information |
| `GET /api/v1/records` | Export records |
| `POST /api/v1/records` | Import records |
| `GET /api/v1/users/:email` | Find a user |
| `GET /openapi.json` | OpenAPI specification |
| `GET /docs` | Scalar documentation |

## Scripts

```bash
pnpm -F @univ-lehavre/crf dev            # Development
pnpm -F @univ-lehavre/crf build          # Production build
pnpm -F @univ-lehavre/crf test           # Unit tests
pnpm -F @univ-lehavre/crf generate:types # Regenerate types
pnpm -F @univ-lehavre/crf mock:redcap    # Mock REDCap (Prism)
pnpm -F @univ-lehavre/crf start          # Start the server
pnpm -F @univ-lehavre/crf test:api       # API tests (Schemathesis)
```

## Branded Types

The package uses branded types for runtime validation:

```typescript
import { RedcapToken, RecordId, InstrumentName, Email } from '@univ-lehavre/crf/redcap';

const token = RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'); // OK
const recordId = RecordId('abc12345678901234567'); // OK (20+ chars)
```

## Documentation

- [API Documentation](../../docs/api/@univ-lehavre/atlas-crf/)
- [CRF Guide](../../docs/guide/dev/crf.md)

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
