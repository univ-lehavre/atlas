# Type Alias: TimeoutMs

> **TimeoutMs** = `number` & `Brand.Brand`\<`"TimeoutMs"`\>

Defined in: [types.ts:22](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/net/src/types.ts#L22)

Branded type for timeout values in milliseconds.
Valid range: 0 to 600000 (10 minutes).

## Example

```typescript
const timeout = TimeoutMs(5000); // 5 seconds
```
