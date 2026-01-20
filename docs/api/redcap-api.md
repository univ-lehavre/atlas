# @univ-lehavre/atlas-redcap-api

TypeScript client for the REDCap API, built with [Effect](https://effect.website/).

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-api
```

## Configuration

```typescript
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('YOUR_32_CHAR_HEXADECIMAL_TOKEN'),
});
```

## Branded Types

The package uses branded types to ensure value validity at both compile-time and runtime.

### RedcapUrl

Valid REDCap API URL (https/http, no credentials or query strings).

```typescript
import { RedcapUrl } from '@univ-lehavre/atlas-redcap-api';

const url = RedcapUrl('https://redcap.example.com/api/');
```

### RedcapToken

REDCap API token (32 uppercase hexadecimal characters).

```typescript
import { RedcapToken } from '@univ-lehavre/atlas-redcap-api';

const token = RedcapToken('ABCDEF0123456789ABCDEF0123456789');
```

### RecordId

REDCap record identifier (alphanumeric, minimum 20 characters).

```typescript
import { RecordId } from '@univ-lehavre/atlas-redcap-api';

const recordId = RecordId('abcdef0123456789abcd');
```

### InstrumentName

REDCap instrument name (lowercase with underscores).

```typescript
import { InstrumentName } from '@univ-lehavre/atlas-redcap-api';

const instrument = InstrumentName('enrollment_form');
```

## API Client

### createRedcapClient

Creates a REDCap client instance.

```typescript
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('YOUR_TOKEN'),
});
```

### exportRecords

Exports records from REDCap.

```typescript
import { Effect } from 'effect';

interface MyRecord {
  record_id: string;
  name: string;
  email: string;
}

const effect = client.exportRecords<MyRecord>({
  fields: ['record_id', 'name', 'email'],
  forms: ['enrollment'],
  filterLogic: '[status] = "1"',
  type: 'flat',
  rawOrLabel: 'raw',
});

// Run the effect
const records = await Effect.runPromise(effect);
```

**Options:**

| Option        | Type               | Description                             |
| ------------- | ------------------ | --------------------------------------- |
| `fields`      | `string[]`         | Fields to export                        |
| `forms`       | `string[]`         | Forms to export                         |
| `filterLogic` | `string`           | REDCap filter expression                |
| `type`        | `'flat' \| 'eav'`  | Output format (default: `'flat'`)       |
| `rawOrLabel`  | `'raw' \| 'label'` | Raw values or labels (default: `'raw'`) |

### importRecords

Imports records into REDCap.

```typescript
const effect = client.importRecords(
  [
    { record_id: '123', name: 'John Doe', email: 'john@example.com' },
    { record_id: '124', name: 'Jane Doe', email: 'jane@example.com' },
  ],
  { overwriteBehavior: 'overwrite' }
);

const result = await Effect.runPromise(effect);
console.log(`${result.count} records imported`);
```

**Options:**

| Option              | Type                             | Description                           |
| ------------------- | -------------------------------- | ------------------------------------- |
| `overwriteBehavior` | `'normal' \| 'overwrite'`        | Overwrite behavior                    |
| `returnContent`     | `'count' \| 'ids' \| 'auto_ids'` | Response content (default: `'count'`) |

### getSurveyLink

Gets the survey link for a record and instrument.

```typescript
import { RecordId, InstrumentName } from '@univ-lehavre/atlas-redcap-api';

const effect = client.getSurveyLink(
  RecordId('abcdef0123456789abcd'),
  InstrumentName('satisfaction_survey')
);

const surveyUrl = await Effect.runPromise(effect);
```

### downloadPdf

Downloads a PDF for a record and instrument.

```typescript
const effect = client.downloadPdf(
  RecordId('abcdef0123456789abcd'),
  InstrumentName('enrollment_form')
);

const pdfBuffer = await Effect.runPromise(effect);
```

### findUserIdByEmail

Finds a user by email.

```typescript
const effect = client.findUserIdByEmail('user@example.com');

const userId = await Effect.runPromise(effect);
// userId is string | null
```

## Error Handling

The package defines three error types:

### RedcapHttpError

HTTP error (non-2xx response).

```typescript
import { RedcapHttpError } from '@univ-lehavre/atlas-redcap-api';

// { _tag: 'RedcapHttpError', status: 401, message: 'Unauthorized' }
```

### RedcapApiError

REDCap API error (200 response with error in body).

```typescript
import { RedcapApiError } from '@univ-lehavre/atlas-redcap-api';

// { _tag: 'RedcapApiError', message: 'Invalid token' }
```

### RedcapNetworkError

Network error (connection failure).

```typescript
import { RedcapNetworkError } from '@univ-lehavre/atlas-redcap-api';

// { _tag: 'RedcapNetworkError', cause: Error }
```

### Pattern Matching with Effect

```typescript
import { Effect, pipe } from 'effect';
import {
  RedcapHttpError,
  RedcapApiError,
  RedcapNetworkError,
} from '@univ-lehavre/atlas-redcap-api';

pipe(
  client.exportRecords(),
  Effect.catchTags({
    RedcapHttpError: (e) => Effect.succeed({ error: `HTTP ${e.status}: ${e.message}` }),
    RedcapApiError: (e) => Effect.succeed({ error: `API: ${e.message}` }),
    RedcapNetworkError: (e) => Effect.succeed({ error: `Network: ${String(e.cause)}` }),
  }),
  Effect.runPromise
);
```

## Security

### escapeFilterLogicValue

Escapes special characters in `filterLogic` values (injection protection).

```typescript
import { escapeFilterLogicValue } from '@univ-lehavre/atlas-redcap-api';

const email = 'user"test@example.com';
const filterLogic = `[email] = "${escapeFilterLogicValue(email)}"`;
// Result: [email] = "user\"test@example.com"
```

## Using with Effect Layer

For dependency injection:

```typescript
import { Effect, Layer } from 'effect';
import {
  makeRedcapClientLayer,
  RedcapClientService,
  RedcapUrl,
  RedcapToken,
} from '@univ-lehavre/atlas-redcap-api';

// Create the layer
const redcapLayer = makeRedcapClientLayer({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('YOUR_TOKEN'),
});

// Use the service
const program = Effect.gen(function* () {
  const client = yield* RedcapClientService;
  const records = yield* client.exportRecords();
  return records;
});

// Run with the layer
Effect.runPromise(Effect.provide(program, redcapLayer));
```
