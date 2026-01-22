# Type Alias: RedcapUrl

> **RedcapUrl** = `string` & `Brand.Brand`\<`"RedcapUrl"`\>

Defined in: [packages/redcap-api/src/brands.ts:127](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/redcap-api/src/brands.ts#L127)

Branded type for REDCap API URL.

Ensures URLs are valid and safe for REDCap API communication.
The URL must meet the following requirements:

- Valid URL format parseable by the URL constructor
- HTTP or HTTPS protocol only
- No embedded credentials (username/password in URL)
- Non-empty hostname
- No query string parameters (REDCap uses POST body for params)
- No URL fragments

## Example

```typescript
// Valid URLs
const url1 = RedcapUrl('https://redcap.example.com/api/');
const url2 = RedcapUrl('http://localhost:8080/redcap/api/');

// Invalid URLs throw BrandError
RedcapUrl('ftp://example.com'); // wrong protocol
RedcapUrl('https://user:pass@example.com'); // credentials in URL
RedcapUrl('https://example.com?token=x'); // query string not allowed
RedcapUrl('not-a-url'); // invalid URL format
```

## Throws

When the URL is invalid or fails security checks
