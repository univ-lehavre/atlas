# Type Alias: TimeoutMs

> **TimeoutMs** = `number` & `Brand.Brand`\<`"TimeoutMs"`\>

Defined in: [types.ts:22](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L22)

Branded type for timeout values in milliseconds.
Valid range: 0 to 600000 (10 minutes).

## Example

```typescript
const timeout = TimeoutMs(5000); // 5 seconds
```
