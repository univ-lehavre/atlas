[**@univ-lehavre/atlas-redcap-api**](../README.md)

---

[@univ-lehavre/atlas-redcap-api](../README.md) / RedcapToken

# Type Alias: RedcapToken

> **RedcapToken** = `string` & `Brand.Brand`\<`"RedcapToken"`\>

Defined in: [packages/redcap-api/src/brands.ts:164](https://github.com/univ-lehavre/atlas/blob/efca797d113c12556abf22a7fdb97dae8aa62ade/packages/redcap-api/src/brands.ts#L164)

Branded type for REDCap API token.

REDCap API tokens are 32-character hexadecimal strings (uppercase A-F, 0-9).
These tokens are used to authenticate API requests and should be treated
as sensitive credentials.

## Example

```typescript
// Valid token (32 uppercase hex characters)
const token = RedcapToken('AABBCCDD11223344AABBCCDD11223344');

// Invalid tokens throw BrandError
RedcapToken('abc'); // too short
RedcapToken('e1b217963ccee21ef78322345b3b8782'); // lowercase not allowed
RedcapToken('G1B217963CCEE21EF78322345B3B8782'); // 'G' not valid hex
```

## Throws

When the token format is invalid
