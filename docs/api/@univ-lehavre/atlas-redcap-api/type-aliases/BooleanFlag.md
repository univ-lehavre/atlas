# Type Alias: BooleanFlag

> **BooleanFlag** = `0` \| `1` & `Brand.Brand`\<`"BooleanFlag"`\>

Defined in: [packages/redcap-api/src/types.ts:408](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L408)

Branded type for boolean flags (0 or 1).

REDCap uses 0 and 1 to represent boolean values in many API responses.
This type ensures the value is exactly 0 or 1.

## Example

```typescript
// Valid boolean flags
const enabled = BooleanFlag(1);
const disabled = BooleanFlag(0);

// Invalid values throw BrandError
BooleanFlag(2); // must be 0 or 1
BooleanFlag(-1); // must be 0 or 1
```

## Throws

When the value is not 0 or 1
