# Function: getAdapter()

> **getAdapter**(`version`): [`RedcapAdapter`](../interfaces/RedcapAdapter.md) \| `undefined`

Defined in: [packages/crf/src/redcap/adapters/index.ts:60](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/adapters/index.ts#L60)

Get the adapter for a specific REDCap version.
Prefer using getAdapterEffect for better error handling.

## Parameters

### version

[`Version`](../interfaces/Version.md)

The REDCap server version

## Returns

[`RedcapAdapter`](../interfaces/RedcapAdapter.md) \| `undefined`

The appropriate adapter for that version, or undefined if not found
