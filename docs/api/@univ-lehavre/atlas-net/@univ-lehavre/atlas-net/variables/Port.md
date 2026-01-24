# Variable: Port

> **Port**: `Constructor`\<[`Port`](../type-aliases/Port.md)\>

Defined in: [types.ts:34](https://github.com/univ-lehavre/atlas/blob/48acc16c89a79209d3be1763a73e3e9607aa38aa/packages/net/src/types.ts#L34)

Constructor for Port branded type with validation.

## Param

The port number (1-65535)

## Returns

A validated Port branded value

## Throws

Brand error if port is not a valid port number (1-65535)

## Example

```typescript
const https = Port(443);   // Valid
const http = Port(80);     // Valid
Port(0);                   // Throws: Invalid port
Port(70000);               // Throws: Invalid port
```
