# Function: isVersionLessThan()

> **isVersionLessThan**(`current`, `maximum`): `boolean`

Defined in: [packages/crf/src/redcap/version.ts:142](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/crf/src/redcap/version.ts#L142)

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
