# Function: createRedcapClient()

> **createRedcapClient**(`config`, `fetchFn`): [`RedcapClient`](../interfaces/RedcapClient.md)

Defined in: [packages/redcap-api/src/client.ts:565](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/client.ts#L565)

Creates a new REDCap API client instance.

This is the main entry point for using the REDCap API. The returned client
provides methods for all supported API operations, each returning an Effect
for functional error handling.

## Parameters

### config

[`RedcapConfig`](../interfaces/RedcapConfig.md)

The REDCap configuration containing URL and token

### fetchFn

(`input`, `init?`) => `Promise`\<`Response`\>

Optional custom fetch function (useful for testing or custom HTTP handling)

## Returns

[`RedcapClient`](../interfaces/RedcapClient.md)

A fully configured RedcapClient instance

## Example

```typescript
import { Effect, pipe } from 'effect';
import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken,
  RecordId,
  InstrumentName,
} from '@univ-lehavre/atlas-redcap-api';

// Create client with validated credentials
const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
});

// Basic usage - get project info
const getInfo = async () => {
  const info = await Effect.runPromise(client.getProjectInfo());
  console.log(`Project: ${info.project_title}`);
};

// Export records with filtering
interface Patient {
  record_id: string;
  first_name: string;
  age: number;
}

const getAdultPatients = async () => {
  const patients = await Effect.runPromise(
    client.exportRecords<Patient>({
      fields: ['record_id', 'first_name', 'age'],
      filterLogic: '[age] >= 18',
    })
  );
  return patients;
};

// Error handling with Effect
const safeGetVersion = pipe(
  client.getVersion(),
  Effect.catchTag('RedcapHttpError', (e) => Effect.succeed(`HTTP Error: ${e.status}`)),
  Effect.catchTag('RedcapNetworkError', () => Effect.succeed('Network unavailable'))
);
```

## See

- [makeRedcapClientLayer](makeRedcapClientLayer.md) - For Effect-based dependency injection
- [RedcapClient](../interfaces/RedcapClient.md) - The interface describing available methods
