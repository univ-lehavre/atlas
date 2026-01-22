# Class: RedcapClientService

Defined in: [packages/redcap-api/src/client.ts:110](https://github.com/univ-lehavre/atlas/blob/c399ec78fb6de6d479acd00b2b8ce08b23561ed1/packages/redcap-api/src/client.ts#L110)

Effect Context Tag for the REDCap Client Service.

Use this tag for dependency injection with Effect's Layer system.
This allows you to provide mock implementations for testing or
swap implementations at runtime.

## Example

```typescript
import { Effect, Layer } from 'effect';
import {
  RedcapClientService,
  makeRedcapClientLayer,
  RedcapUrl,
  RedcapToken,
} from '@univ-lehavre/atlas-redcap-api';

// Create a layer with real configuration
const RedcapLayer = makeRedcapClientLayer({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
});

// Use the service in your program
const program = Effect.gen(function* () {
  const client = yield* RedcapClientService;
  return yield* client.getVersion();
});

// Provide the layer and run
Effect.runPromise(program.pipe(Effect.provide(RedcapLayer)));
```

## See

[makeRedcapClientLayer](../functions/makeRedcapClientLayer.md) - Create a Layer providing this service

## Extends

- `TagClassShape`\<`"RedcapClientService"`, [`RedcapClient`](../interfaces/RedcapClient.md), `this`\>

## Constructors

### Constructor

> **new RedcapClientService**(`_`): `RedcapClientService`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:109

#### Parameters

##### \_

`never`

#### Returns

`RedcapClientService`

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().constructor`
