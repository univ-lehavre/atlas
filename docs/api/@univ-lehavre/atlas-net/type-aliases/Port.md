# Type Alias: Port

> **Port** = `number` & `Brand.Brand`\<`"Port"`\>

Defined in: [types.ts:34](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L34)

Branded type for port numbers.
Valid range: 1 to 65535.

## Example

```typescript
const https = Port(443);
const http = Port(80);
```
