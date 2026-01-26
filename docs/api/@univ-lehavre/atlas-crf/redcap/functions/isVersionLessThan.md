# Function: isVersionLessThan()

> **isVersionLessThan**(`current`, `maximum`): `boolean`

Defined in: [packages/crf/src/redcap/version.ts:142](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/version.ts#L142)

Check if a version is less than the specified maximum.

## Parameters

### current

[`Version`](../interfaces/Version.md)

The version to check

### maximum

[`Version`](../interfaces/Version.md)

The maximum version (exclusive)

## Returns

`boolean`

true if current < maximum
