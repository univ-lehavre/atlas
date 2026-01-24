# Function: escapeFilterLogicValue()

> **escapeFilterLogicValue**(`value`): `string`

Defined in: [packages/crf/src/redcap/client.ts:30](https://github.com/univ-lehavre/atlas/blob/48acc16c89a79209d3be1763a73e3e9607aa38aa/packages/crf/src/redcap/client.ts#L30)

Escapes special characters in a value to be used in REDCap filterLogic.
Prevents injection attacks by escaping double quotes and backslashes.

## Parameters

### value

`string`

## Returns

`string`
