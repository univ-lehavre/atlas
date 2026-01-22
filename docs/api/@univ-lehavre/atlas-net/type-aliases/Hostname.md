# Type Alias: Hostname

> **Hostname** = `string` & `Brand.Brand`\<`"Hostname"`\>

Defined in: [types.ts:59](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L59)

Branded type for hostnames.
Validates according to RFC 1123. Also accepts valid IP addresses.

## Example

```typescript
const host = Hostname('example.com');
const local = Hostname('localhost');
const ip = Hostname('192.168.1.1'); // IP addresses are valid hostnames
```
