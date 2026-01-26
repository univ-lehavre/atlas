# Type Alias: Port

> **Port** = `number` & `Brand.Brand`\<`"Port"`\>

Defined in: [types.ts:34](https://github.com/univ-lehavre/atlas/blob/eb30e044e3b81463596de83b91ee0942c13da854/packages/net/src/types.ts#L34)

Branded type for port numbers.
Valid range: 1 to 65535.

## Example

```typescript
const https = Port(443);
const http = Port(80);
```
