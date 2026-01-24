# Function: makeRedcapClientLayer()

> **makeRedcapClientLayer**(`config`, `fetchFn`): `Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>

Defined in: [packages/crf/src/redcap/client.ts:372](https://github.com/univ-lehavre/atlas/blob/48acc16c89a79209d3be1763a73e3e9607aa38aa/packages/crf/src/redcap/client.ts#L372)

Creates an Effect Layer providing the RedcapClientService.

## Parameters

### config

[`RedcapConfig`](../interfaces/RedcapConfig.md)

### fetchFn

(`input`, `init?`) => `Promise`\<`Response`\>

## Returns

`Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>
