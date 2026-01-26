# Function: isVersionInRange()

> **isVersionInRange**(`current`, `min`, `max`): `boolean`

Defined in: [packages/crf/src/redcap/version.ts:153](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/version.ts#L153)

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
