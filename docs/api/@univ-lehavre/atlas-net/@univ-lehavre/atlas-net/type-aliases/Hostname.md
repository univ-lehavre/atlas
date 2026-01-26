# Type Alias: Hostname

> **Hostname** = `string` & `Brand.Brand`\<`"Hostname"`\>

Defined in: [types.ts:59](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L59)

Branded type for hostnames.
Validates according to RFC 1123. Also accepts valid IP addresses.

## Example

```typescript
const host = Hostname('example.com');
const local = Hostname('localhost');
const ip = Hostname('192.168.1.1'); // IP addresses are valid hostnames
```
