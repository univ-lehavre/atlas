# Atlas CRF (REDCap)

Atlas CRF provides a TypeScript client and HTTP server for interacting with the REDCap API.

> **User documentation:** [What is Atlas CRF?](../#atlas-crf-clinical-research-forms)

## Packages

| Package                   | Description                       |
| ------------------------- | --------------------------------- |
| `@univ-lehavre/atlas-crf` | Effect client + Hono server + CLI |

## Architecture

```
packages/crf-core/       # Pure REDCap domain types, brands and validation
packages/crf-client/     # Effect client and generated REDCap API types
services/crf/               # Hono HTTP microservice
cli/crf/                    # crf-redcap and crf-server commands
cli/crf-openapi/         # OpenAPI extraction, comparison and documentation tools
```

## REDCap Client

### Installation

```bash
pnpm add @univ-lehavre/atlas-crf-client effect
```

### Basic usage

```typescript
import { Effect } from "effect";
import {
  createCrfClient,
  CrfUrl,
  CrfToken,
} from "@univ-lehavre/atlas-crf-client";

const client = createCrfClient({
  url: CrfUrl("https://redcap.example.com/api/"),
  token: CrfToken("YOUR_32_CHAR_HEXADECIMAL_TOKEN"),
});

// Export records
const records = await Effect.runPromise(
  client.exportRecords({ fields: ["record_id", "name"] }),
);

// Project information
const projectInfo = await Effect.runPromise(client.getProjectInfo());

// List of instruments
const instruments = await Effect.runPromise(client.listInstruments());
```

### Error handling

```typescript
import { Effect, Match } from "effect";
import {
  CrfError,
  CrfNetworkError,
  CrfAuthError,
} from "@univ-lehavre/atlas-crf";

const program = client.exportRecords({ fields: ["record_id"] }).pipe(
  Effect.catchTag("CrfAuthError", (error) => {
    console.error("Invalid token:", error.message);
    return Effect.succeed([]);
  }),
  Effect.catchTag("CrfNetworkError", (error) => {
    console.error("Network error:", error.message);
    return Effect.succeed([]);
  }),
);
```

### Branded Types

The client uses branded types for compile-time validation:

```typescript
import { RecordId, CrfUrl, CrfToken } from "@univ-lehavre/atlas-crf";

// These lines fail at compile time if the format is invalid
const recordId = RecordId("123"); // OK
const url = CrfUrl("https://redcap.example.com/api/"); // OK
const token = CrfToken("AAAABBBBCCCCDDDDEEEE11112222"); // 32 chars hex

// Compilation error:
const badToken = CrfToken("too-short"); // ❌ Type error
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

| Method | Endpoint   | Description         |
| ------ | ---------- | ------------------- |
| GET    | `/health`  | Service health      |
| GET    | `/project` | Project information |
| GET    | `/records` | Export records      |
| POST   | `/records` | Import records      |
| GET    | `/users`   | List of users       |

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
import { createCrfClient } from "@univ-lehavre/atlas-crf";

const client = createCrfClient({
  url: CrfUrl("https://redcap.example.com/api/"),
  token: CrfToken("..."),
  version: "14.5.10", // Optional, automatically detected
});
```

## See also

- [CLI Tools](/guide/developers/cli) - Command line tooling overview
- [Architecture](/guide/developers/architecture) - Effect patterns and ESLint
