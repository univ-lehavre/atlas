# Function: makeRedcapClientLayer()

> **makeRedcapClientLayer**(`config`, `fetchFn`): `Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>

Defined in: [packages/crf/src/redcap/client.ts:372](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/client.ts#L372)

Creates an Effect Layer providing the RedcapClientService.

## Parameters

### config

[`RedcapConfig`](../interfaces/RedcapConfig.md)

### fetchFn

(`input`, `init?`) => `Promise`\<`Response`\>

## Returns

`Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>
