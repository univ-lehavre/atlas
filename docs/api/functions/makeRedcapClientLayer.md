[**@univ-lehavre/atlas-redcap-api**](../README.md)

---

[@univ-lehavre/atlas-redcap-api](../README.md) / makeRedcapClientLayer

# Function: makeRedcapClientLayer()

> **makeRedcapClientLayer**(`config`, `fetchFn`): `Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>

Defined in: [packages/redcap-api/src/client.ts:493](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/client.ts#L493)

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
