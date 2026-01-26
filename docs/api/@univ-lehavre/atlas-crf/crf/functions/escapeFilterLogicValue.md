# Function: escapeFilterLogicValue()

> **escapeFilterLogicValue**(`value`): `string`

Defined in: [packages/crf/src/redcap/client.ts:30](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/crf/src/redcap/client.ts#L30)

Escapes special characters in a value to be used in REDCap filterLogic.
Prevents injection attacks by escaping double quotes and backslashes.

## Parameters

### value

`string`

## Returns

`string`
