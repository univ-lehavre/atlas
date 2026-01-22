# Type Alias: IsoTimestamp

> **IsoTimestamp** = `string` & `Brand.Brand`\<`"IsoTimestamp"`\>

Defined in: [packages/redcap-api/src/types.ts:361](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L361)

Branded type for ISO 8601 timestamps.

Validates that a string is a valid ISO 8601 date/datetime format.
REDCap uses format like "2024-01-15 10:30:00" or ISO format.

## Example

```typescript
// Valid timestamps
const ts1 = IsoTimestamp('2024-01-15 10:30:00');
const ts2 = IsoTimestamp('2024-01-15T10:30:00Z');
const ts3 = IsoTimestamp('2024-01-15');

// Invalid values throw BrandError
IsoTimestamp('invalid'); // not a valid date
IsoTimestamp('15/01/2024'); // wrong format
```

## Throws

When the string is not a valid timestamp
