# Variable: Port

> **Port**: `Constructor`\<[`Port`](../type-aliases/Port.md)\>

Defined in: [types.ts:34](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/net/src/types.ts#L34)

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
