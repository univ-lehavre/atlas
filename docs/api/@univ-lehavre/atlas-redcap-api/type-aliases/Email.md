# Type Alias: Email

> **Email** = `string` & `Brand.Brand`\<`"Email"`\>

Defined in: [packages/redcap-api/src/types.ts:255](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L255)

Branded type for email addresses.

Validates email addresses using a standard regex pattern.
Used for user lookups and communication in REDCap.

## Example

```typescript
// Valid emails
const email1 = Email('user@example.com');
const email2 = Email('john.doe+tag@university.edu');

// Invalid emails throw BrandError
Email('invalid'); // no @ symbol
Email('@example.com'); // no local part
Email('user@'); // no domain
```

## Throws

When the email format is invalid
