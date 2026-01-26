# Function: getAdapterEffect()

> **getAdapterEffect**(`version`): `Effect`\<[`RedcapAdapter`](../interfaces/RedcapAdapter.md), [`UnsupportedVersionError`](../classes/UnsupportedVersionError.md)\>

Defined in: [packages/crf/src/redcap/adapters/index.ts:45](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/crf/src/redcap/adapters/index.ts#L45)

Get the adapter for a specific REDCap version as an Effect.

## Parameters

### version

[`Version`](../interfaces/Version.md)

The REDCap server version

## Returns

`Effect`\<[`RedcapAdapter`](../interfaces/RedcapAdapter.md), [`UnsupportedVersionError`](../classes/UnsupportedVersionError.md)\>

Effect containing the adapter or UnsupportedVersionError

## Example

```typescript
const adapter = yield* getAdapterEffect({ major: 14, minor: 5, patch: 10 });
// Returns v14Adapter
```
