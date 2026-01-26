# Type Alias: Port

> **Port** = `number` & `Brand.Brand`\<`"Port"`\>

Defined in: [types.ts:34](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L34)

Branded type for port numbers.
Valid range: 1 to 65535.

## Example

```typescript
const https = Port(443);
const http = Port(80);
```
