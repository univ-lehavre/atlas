# Mock REDCap Server

Mock implementation of the REDCap API for local testing and development.

## Overview

This mock server implements all REDCap API endpoints used by the Atlas project, with full TypeScript support and branded type validation to ensure consistency with [`@univ-lehavre/atlas-redcap-api`](../../packages/redcap-api).

## Features

- ✅ Full TypeScript implementation
- ✅ Branded type validation (RecordId, InstrumentName, etc.)
- ✅ All endpoints implemented:
  - `version` - Get REDCap version
  - `project` - Get project metadata
  - `instrument` - List instruments/forms
  - `metadata` - Get data dictionary
  - `exportFieldNames` - Field name mappings
  - `record` (export) - Export records with filtering
  - `record` (import) - Import records
  - `surveyLink` - Generate survey links
  - `pdf` - Download form PDFs
- ✅ Integration tests verifying compatibility with redcap-api
- ✅ Sample data for testing

## Usage

### Start the server

```bash
pnpm -F @univ-lehavre/atlas-mock-redcap start
```

The server runs on port 8080 by default (configurable via `PORT` environment variable).

### Connect with redcap-api client

```typescript
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';

const client = createRedcapClient({
  url: RedcapUrl('http://localhost:8080/api/'),
  token: RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), // Any 32-hex-char token works
});

// Use the client as normal
const version = await Effect.runPromise(client.getVersion());
const records = await Effect.runPromise(client.exportRecords());
```

## Sample Data

The mock includes test data with 3 records:

| record_id            | name       | email                  | status |
| -------------------- | ---------- | ---------------------- | ------ |
| abcdef0123456789abcd | John Doe   | john.doe@example.com   | 1      |
| bcdef0123456789abcde | Jane Smith | jane.smith@example.com | 1      |
| cdef0123456789abcdef | Bob Wilson | bob.wilson@example.com | 0      |

## Development

### Build

```bash
pnpm -F @univ-lehavre/atlas-mock-redcap build
```

### Run tests

```bash
pnpm -F @univ-lehavre/atlas-mock-redcap test
```

### Watch mode

```bash
pnpm -F @univ-lehavre/atlas-mock-redcap dev
```

## Architecture

```
tools/mock-redcap/
├── src/
│   ├── index.ts          # Main server (for production use)
│   ├── test-server.ts    # Test server instance
│   └── index.test.ts     # Integration tests
├── dist/                 # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Limitations

- Accepts any valid 32-hex-character token (no token validation)
- Simple in-memory data storage (resets on restart)
- Limited filterLogic support (email field only)
- No user authentication/permissions

These limitations are intentional to keep the mock simple and fast for testing purposes.
