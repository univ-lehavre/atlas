# Type Alias: NonEmptyString

> **NonEmptyString** = `string` & `Brand.Brand`\<`"NonEmptyString"`\>

Defined in: [packages/redcap-api/src/types.ts:325](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L325)

Branded type for non-empty strings.

Validates that a string is not empty (length >= 1).
Used for required text fields like project_title.

## Example

```typescript
// Valid non-empty strings
const title = NonEmptyString('My Project');
const name = NonEmptyString('a');

// Invalid values throw BrandError
NonEmptyString(''); // empty string not allowed
```

## Throws

When the string is empty
