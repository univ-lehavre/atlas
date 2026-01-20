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

- **Type-safe**: Branded types for URLs, tokens, record IDs, and instrument names
- **Effect-based**: Full integration with the Effect ecosystem
- **Secure**: Built-in protection against filterLogic injection

## API

### Client Methods

| Method              | Description                              |
| ------------------- | ---------------------------------------- |
| `exportRecords`     | Export records with optional filtering   |
| `importRecords`     | Import records into REDCap               |
| `getSurveyLink`     | Get survey link for a record             |
| `downloadPdf`       | Download PDF for a record and instrument |
| `findUserIdByEmail` | Find user ID by email address            |

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
