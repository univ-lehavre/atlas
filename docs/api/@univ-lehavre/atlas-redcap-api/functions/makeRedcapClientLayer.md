# Function: makeRedcapClientLayer()

> **makeRedcapClientLayer**(`config`, `fetchFn`): `Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>

Defined in: [packages/redcap-api/src/client.ts:494](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/client.ts#L494)

Creates an Effect Layer providing the RedcapClientService.

Use this when you want to integrate the REDCap client with Effect's
dependency injection system. The layer can be provided to programs
that depend on RedcapClientService.

## Parameters

### config

[`RedcapConfig`](../interfaces/RedcapConfig.md)

The REDCap configuration containing URL and token

### fetchFn

(`input`, `init?`) => `Promise`\<`Response`\>

Optional custom fetch function (defaults to global fetch)

## Returns

`Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>

A Layer that provides RedcapClientService

## Example

```typescript
import { Effect, Layer } from 'effect';
import {
  RedcapClientService,
  makeRedcapClientLayer,
  RedcapUrl,
  RedcapToken,
} from '@univ-lehavre/atlas-redcap-api';

// Create the layer
const RedcapLayer = makeRedcapClientLayer({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
});

// Define a program using the service
const program = Effect.gen(function* () {
  const client = yield* RedcapClientService;
  const version = yield* client.getVersion();
  const info = yield* client.getProjectInfo();
  return { version, projectTitle: info.project_title };
});

// Run with the layer
Effect.runPromise(program.pipe(Effect.provide(RedcapLayer))).then(console.log);
```

## See

- [RedcapClientService](../classes/RedcapClientService.md) - The service tag to use in programs
- [createRedcapClient](createRedcapClient.md) - Direct client creation without Effect Layer
