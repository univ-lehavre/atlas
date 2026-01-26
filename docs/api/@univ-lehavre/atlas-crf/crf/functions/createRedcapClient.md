# Function: createRedcapClient()

> **createRedcapClient**(`config`, `fetchFn`): [`RedcapClient`](../interfaces/RedcapClient.md)

Defined in: [packages/crf/src/redcap/client.ts:403](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/client.ts#L403)

Creates a new REDCap API client instance.

The client automatically detects the REDCap server version and adapts
its requests accordingly. Version detection happens lazily on the first
API call that requires version-specific behavior.

## Parameters

### config

[`RedcapConfig`](../interfaces/RedcapConfig.md)

REDCap connection configuration

### fetchFn

(`input`, `init?`) => `Promise`\<`Response`\>

Optional custom fetch function (for testing)

## Returns

[`RedcapClient`](../interfaces/RedcapClient.md)

A version-aware REDCap client

## Example

```typescript
import { Effect } from 'effect';
import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/crf/redcap';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
});

// Version is auto-detected on first call
const records = await Effect.runPromise(client.exportRecords());
```
