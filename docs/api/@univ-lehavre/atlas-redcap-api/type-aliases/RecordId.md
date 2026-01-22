# Type Alias: RecordId

> **RecordId** = `string` & `Brand.Brand`\<`"RecordId"`\>

Defined in: [packages/redcap-api/src/brands.ts:201](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/brands.ts#L201)

Branded type for REDCap record IDs.

Record IDs must be alphanumeric strings of at least 20 characters.
This format is compatible with Appwrite-style IDs commonly used
in the Atlas project.

## Example

```typescript
// Valid record IDs (alphanumeric, 20+ characters)
const id1 = RecordId('abc12345678901234567');
const id2 = RecordId('ABC12345678901234567890');

// Invalid record IDs throw BrandError
RecordId('short'); // too short (less than 20 chars)
RecordId('abc-123-456-789-012'); // hyphens not allowed
RecordId('abc_123_456_789_012'); // underscores not allowed
```

## Throws

When the record ID format is invalid
