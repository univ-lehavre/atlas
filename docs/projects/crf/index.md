# Atlas CRF (REDCap)

Atlas CRF provides a TypeScript client and HTTP server for interacting with the REDCap API.

> **User documentation:** [What is Atlas CRF?](../#atlas-crf-clinical-research-forms)

## Packages

| Package | Description |
|---------|-------------|
| `@univ-lehavre/atlas-crf` | Effect client + Hono server + CLI |

## Architecture

```
packages/crf/
├── specs/
│   └── redcap.yaml              # OpenAPI 3.1.0 REDCap spec
├── src/
│   ├── redcap/                  # Effect client for REDCap
│   │   ├── generated/types.ts   # Generated types (openapi-typescript)
│   │   ├── brands.ts            # Branded types (RecordId, etc.)
│   │   ├── client.ts            # Main client
│   │   ├── errors.ts            # Typed errors
│   │   └── index.ts
│   ├── server/                  # HTTP microservice (Hono)
│   │   ├── routes/              # health, project, records, users
│   │   ├── middleware/          # rate-limit, validation
│   │   └── index.ts
│   ├── cli/                     # CLI tools
│   │   ├── redcap/              # crf-redcap (connectivity test)
│   │   └── server/              # crf-server (CRF server test)
│   └── bin/                     # CLI entry points
└── test/
```

## REDCap Client

### Installation

```bash
pnpm add @univ-lehavre/atlas-crf effect
```

### Basic usage

```typescript
import { Effect } from 'effect';
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-crf';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('YOUR_32_CHAR_HEXADECIMAL_TOKEN'),
});

// Export records
const records = await Effect.runPromise(
  client.exportRecords({ fields: ['record_id', 'name'] })
);

// Project information
const projectInfo = await Effect.runPromise(client.getProjectInfo());

// List of instruments
const instruments = await Effect.runPromise(client.listInstruments());
```

### Error handling

```typescript
import { Effect, Match } from 'effect';
import { RedcapError, RedcapNetworkError, RedcapAuthError } from '@univ-lehavre/atlas-crf';

const program = client.exportRecords({ fields: ['record_id'] }).pipe(
  Effect.catchTag('RedcapAuthError', (error) => {
    console.error('Invalid token:', error.message);
    return Effect.succeed([]);
  }),
  Effect.catchTag('RedcapNetworkError', (error) => {
    console.error('Network error:', error.message);
    return Effect.succeed([]);
  })
);
```

### Branded Types

The client uses branded types for compile-time validation:

```typescript
import { RecordId, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-crf';

// These lines fail at compile time if the format is invalid
const recordId = RecordId('123');                    // OK
const url = RedcapUrl('https://redcap.example.com/api/');  // OK
const token = RedcapToken('AAAABBBBCCCCDDDDEEEE11112222'); // 32 chars hex

// Compilation error:
const badToken = RedcapToken('too-short');  // ❌ Type error
```

## HTTP Server

The package includes an HTTP server (Hono) that exposes the REDCap API in a REST manner.

### Starting the server

```bash
# Environment variables
export REDCAP_API_URL=https://redcap.example.com/api/
export REDCAP_API_TOKEN=your_token

# Start the server
pnpm -F @univ-lehavre/atlas-crf start
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/project` | Project information |
| GET | `/records` | Export records |
| POST | `/records` | Import records |
| GET | `/users` | List of users |

### Middleware

- **Rate Limiting**: Protection against abuse
- **Validation**: Input parameter validation

## CLI

### crf-redcap

Connectivity test with the REDCap API:

```bash
# Basic test
crf-redcap test

# With custom configuration
REDCAP_API_URL=https://redcap.example.com/api/ \
REDCAP_API_TOKEN=AAAABBBBCCCCDDDDEEEE11112222 \
crf-redcap test

# JSON output
crf-redcap test --json
```

Tests performed:
1. REDCap version
2. Project information
3. List of instruments
4. List of fields
5. Export of a sample of records

### crf-server

CRF server test:

```bash
crf-server test
```

## Type generation

TypeScript types are generated from the OpenAPI spec:

```bash
pnpm -F @univ-lehavre/atlas-crf generate:types
```

This generates `src/redcap/generated/types.ts` from `specs/redcap.yaml`.

## Version adapters

The client supports different REDCap versions via adapters:

```typescript
// Adapters handle API differences between versions
import { createRedcapClient } from '@univ-lehavre/atlas-crf';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('...'),
  version: '14.5.10',  // Optional, automatically detected
});
```

## See also

- [CLI Tools](./cli.md) - Complete CLI documentation
- [Architecture](./architecture.md) - Effect patterns and ESLint
