[**@univ-lehavre/atlas-redcap-api**](../README.md)

---

[@univ-lehavre/atlas-redcap-api](../README.md) / escapeFilterLogicValue

# Function: escapeFilterLogicValue()

> **escapeFilterLogicValue**(`value`): `string`

Defined in: [packages/redcap-api/src/client.ts:72](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/client.ts#L72)

Escapes special characters in a value to be used in REDCap filterLogic.

Prevents injection attacks by escaping double quotes and backslashes.
Always use this function when incorporating user input into filterLogic expressions.

## Parameters

### value

`string`

The string value to escape

## Returns

`string`

The escaped string safe for use in filterLogic

## Example

```typescript
import { escapeFilterLogicValue } from '@univ-lehavre/atlas-redcap-api';

// Safe usage with user input
const userEmail = 'john"injection@example.com';
const filterLogic = `[email] = "${escapeFilterLogicValue(userEmail)}"`;
// Result: [email] = "john\"injection@example.com"

// Without escaping (UNSAFE - don't do this!)
const unsafeFilter = `[email] = "${userEmail}"`;
// Could allow injection attacks
```

## See

[RedcapClient.findUserIdByEmail](../interfaces/RedcapClient.md#finduseridbyemail) - Uses this function internally
