# Type Alias: Port

> **Port** = `number` & `Brand.Brand`\<`"Port"`\>

Defined in: [types.ts:34](https://github.com/univ-lehavre/atlas/blob/48acc16c89a79209d3be1763a73e3e9607aa38aa/packages/net/src/types.ts#L34)

Branded type for port numbers.
Valid range: 1 to 65535.

## Example

```typescript
const https = Port(443);
const http = Port(80);
```
