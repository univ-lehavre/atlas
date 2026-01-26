# Type Alias: Hostname

> **Hostname** = `string` & `Brand.Brand`\<`"Hostname"`\>

Defined in: [types.ts:59](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/net/src/types.ts#L59)

Branded type for hostnames.
Validates according to RFC 1123. Also accepts valid IP addresses.

## Example

```typescript
const host = Hostname('example.com');
const local = Hostname('localhost');
const ip = Hostname('192.168.1.1'); // IP addresses are valid hostnames
```
