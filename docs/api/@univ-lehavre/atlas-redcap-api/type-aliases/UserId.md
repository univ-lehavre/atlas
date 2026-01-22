# Type Alias: UserId

> **UserId** = `string` & `Brand.Brand`\<`"UserId"`\>

Defined in: [packages/redcap-api/src/types.ts:216](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L216)

Branded type for REDCap user IDs.

User IDs in REDCap are alphanumeric strings that identify users in the system.
They must be at least 1 character and contain only alphanumeric characters and underscores.

## Example

```typescript
// Valid user IDs
const id1 = UserId('user123');
const id2 = UserId('john_doe');

// Invalid user IDs throw BrandError
UserId(''); // empty string not allowed
UserId('user@123'); // special characters not allowed
```

## Throws

When the user ID format is invalid
