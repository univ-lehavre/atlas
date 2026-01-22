# Type Alias: SafeApiUrl

> **SafeApiUrl** = `string` & `Brand.Brand`\<`"SafeApiUrl"`\>

Defined in: [types.ts:323](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L323)

Branded type for safe API URLs.

Ensures URLs meet security requirements for API communication:

- Valid URL format parseable by the URL constructor
- HTTP or HTTPS protocol only
- No embedded credentials (username/password in URL)
- Non-empty hostname
- No query string parameters (API params should be in request body)
- No URL fragments

## Example

```typescript
// Valid URLs
const url1 = SafeApiUrl('https://api.example.com/');
const url2 = SafeApiUrl('http://localhost:8080/api/');

// Invalid URLs throw BrandError
SafeApiUrl('ftp://example.com'); // wrong protocol
SafeApiUrl('https://user:pass@example.com'); // credentials in URL
SafeApiUrl('https://example.com?token=x'); // query string not allowed
SafeApiUrl('not-a-url'); // invalid URL format
```

## Throws

When the URL is invalid or fails security checks
