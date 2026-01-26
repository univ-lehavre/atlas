# Variable: TimeoutMs

> **TimeoutMs**: `Constructor`\<[`TimeoutMs`](../type-aliases/TimeoutMs.md)\>

Defined in: [types.ts:22](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/net/src/types.ts#L22)

Constructor for TimeoutMs branded type with validation.

## Param

The timeout value in milliseconds (0-600000)

## Returns

A validated TimeoutMs branded value

## Throws

Brand error if timeout is not an integer within valid range (0-600000)

## Example

```typescript
const timeout = TimeoutMs(5000);  // Valid
const zero = TimeoutMs(0);        // Valid (no timeout)
TimeoutMs(-1);                    // Throws: Invalid timeout
TimeoutMs(700000);                // Throws: Invalid timeout
```
