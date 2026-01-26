# Function: makeRedcapClientLayer()

> **makeRedcapClientLayer**(`config`, `fetchFn`): `Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>

Defined in: [packages/crf/src/redcap/client.ts:372](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/crf/src/redcap/client.ts#L372)

Creates an Effect Layer providing the RedcapClientService.

## Parameters

### config

[`RedcapConfig`](../interfaces/RedcapConfig.md)

### fetchFn

(`input`, `init?`) => `Promise`\<`Response`\>

## Returns

`Layer`\<[`RedcapClientService`](../classes/RedcapClientService.md)\>
