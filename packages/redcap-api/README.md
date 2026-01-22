# @univ-lehavre/atlas-redcap-api

TypeScript client for the REDCap API, built with [Effect](https://effect.website/).

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-api
```

## Quick Start

```typescript
import { Effect } from 'effect';
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/atlas-redcap-api';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('YOUR_32_CHAR_HEXADECIMAL_TOKEN'),
});

// Export records
const records = await Effect.runPromise(
  client.exportRecords({
    fields: ['record_id', 'name', 'email'],
    forms: ['enrollment'],
  })
);
```

## Features

- **Type-safe**: Branded types for URLs, tokens, record IDs, instrument names, and more
- **Effect-based**: Full integration with the Effect ecosystem
- **Secure**: Built-in protection against filterLogic injection

## Branded Types

| Type             | Description                               |
| ---------------- | ----------------------------------------- |
| `RedcapUrl`      | Safe API URL (HTTP/HTTPS, no credentials) |
| `RedcapToken`    | 32-character uppercase hexadecimal token  |
| `RecordId`       | Alphanumeric ID (20+ characters)          |
| `InstrumentName` | Lowercase name with underscores           |
| `UserId`         | Alphanumeric user ID with underscores     |
| `Email`          | Valid email address                       |
| `PositiveInt`    | Integer >= 1                              |
| `NonEmptyString` | String with length > 0                    |
| `IsoTimestamp`   | ISO 8601 date/datetime                    |
| `BooleanFlag`    | 0 or 1                                    |

```typescript
import {
  RedcapUrl,
  RedcapToken,
  RecordId,
  InstrumentName,
  UserId,
  Email,
  PositiveInt,
  NonEmptyString,
  IsoTimestamp,
  BooleanFlag,
} from '@univ-lehavre/atlas-redcap-api';

// All branded types validate at runtime
const url = RedcapUrl('https://redcap.example.com/api/');
const token = RedcapToken('AABBCCDD11223344AABBCCDD11223344');
const recordId = RecordId('abc12345678901234567');
const instrument = InstrumentName('demographics');
const userId = UserId('john_doe');
const email = Email('user@example.com');
const projectId = PositiveInt(123);
const title = NonEmptyString('My Project');
const timestamp = IsoTimestamp('2024-01-15 10:30:00');
const flag = BooleanFlag(1);
```

## API

### Client Methods

| Method                | Description                              |
| --------------------- | ---------------------------------------- |
| `exportRecords`       | Export records with optional filtering   |
| `importRecords`       | Import records into REDCap               |
| `getSurveyLink`       | Get survey link for a record             |
| `downloadPdf`         | Download PDF for a record and instrument |
| `findUserIdByEmail`   | Find user ID by email address            |
| `getVersion`          | Get REDCap version                       |
| `getProjectInfo`      | Get project metadata                     |
| `getInstruments`      | Get list of instruments/forms            |
| `getFields`           | Get field metadata (data dictionary)     |
| `getExportFieldNames` | Get export field name mappings           |

### Error Types

| Error                | Description                   |
| -------------------- | ----------------------------- |
| `RedcapHttpError`    | HTTP error (non-2xx response) |
| `RedcapApiError`     | REDCap API error              |
| `RedcapNetworkError` | Network/connection error      |

## Documentation

See the [full documentation](https://univ-lehavre.github.io/atlas/api/redcap-api) for detailed usage examples.

## License

MIT
