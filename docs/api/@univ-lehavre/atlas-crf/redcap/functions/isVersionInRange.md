# Function: isVersionInRange()

> **isVersionInRange**(`current`, `min`, `max`): `boolean`

Defined in: [packages/crf/src/redcap/version.ts:153](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/version.ts#L153)

Check if a version falls within a range [min, max).

## Parameters

### current

[`Version`](../interfaces/Version.md)

The version to check

### min

[`Version`](../interfaces/Version.md)

Minimum version (inclusive)

### max

Maximum version (exclusive), undefined means no upper bound

[`Version`](../interfaces/Version.md) | `undefined`

## Returns

`boolean`

true if min <= current < max (or min <= current if max is undefined)
