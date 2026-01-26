# Type Alias: TimeoutMs

> **TimeoutMs** = `number` & `Brand.Brand`\<`"TimeoutMs"`\>

Defined in: [types.ts:22](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/types.ts#L22)

Branded type for timeout values in milliseconds.
Valid range: 0 to 600000 (10 minutes).

## Example

```typescript
const timeout = TimeoutMs(5000); // 5 seconds
```
