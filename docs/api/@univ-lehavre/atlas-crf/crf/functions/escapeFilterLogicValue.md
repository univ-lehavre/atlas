# Function: escapeFilterLogicValue()

> **escapeFilterLogicValue**(`value`): `string`

Defined in: [packages/crf/src/redcap/client.ts:30](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/crf/src/redcap/client.ts#L30)

Escapes special characters in a value to be used in REDCap filterLogic.
Prevents injection attacks by escaping double quotes and backslashes.

## Parameters

### value

`string`

## Returns

`string`
