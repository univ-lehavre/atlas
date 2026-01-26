# Function: escapeFilterLogicValue()

> **escapeFilterLogicValue**(`value`): `string`

Defined in: [packages/crf/src/redcap/client.ts:30](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/crf/src/redcap/client.ts#L30)

Escapes special characters in a value to be used in REDCap filterLogic.
Prevents injection attacks by escaping double quotes and backslashes.

## Parameters

### value

`string`

## Returns

`string`
