# Type Alias: Port

> **Port** = `number` & `Brand.Brand`\<`"Port"`\>

Defined in: [types.ts:34](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/net/src/types.ts#L34)

Branded type for port numbers.
Valid range: 1 to 65535.

## Example

```typescript
const https = Port(443);
const http = Port(80);
```
