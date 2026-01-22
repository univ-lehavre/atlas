# Type Alias: RedcapUrl

> **RedcapUrl** = [`SafeApiUrl`](../../atlas-net/type-aliases/SafeApiUrl.md)

Defined in: [packages/redcap-api/src/types.ts:67](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/redcap-api/src/types.ts#L67)

Branded type for REDCap API URL.

Type alias for SafeApiUrl from @univ-lehavre/atlas-net.
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
