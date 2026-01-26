# Function: makeRedcapClientLayer()

> **makeRedcapClientLayer**(`config`, `fetchFn`): `Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>

Defined in: [packages/crf/src/redcap/client.ts:372](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/client.ts#L372)

Creates an Effect Layer providing the RedcapClientService.

## Parameters

### config

[`RedcapConfig`](../interfaces/RedcapConfig.md)

### fetchFn

(`input`, `init?`) => `Promise`\<`Response`\>

## Returns

`Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>
