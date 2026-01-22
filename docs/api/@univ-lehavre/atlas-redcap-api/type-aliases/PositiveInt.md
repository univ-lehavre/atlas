# Type Alias: PositiveInt

> **PositiveInt** = `number` & `Brand.Brand`\<`"PositiveInt"`\>

Defined in: [packages/redcap-api/src/types.ts:291](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L291)

Branded type for positive integers.

Validates that a number is a positive integer (>= 1).
Used for IDs like project_id in REDCap.

## Example

```typescript
// Valid positive integers
const id1 = PositiveInt(1);
const id2 = PositiveInt(12345);

// Invalid values throw BrandError
PositiveInt(0); // must be >= 1
PositiveInt(-1); // negative not allowed
PositiveInt(1.5); // must be integer
```

## Throws

When the value is not a positive integer
