# Variable: Port

> **Port**: `Constructor`\<[`Port`](../type-aliases/Port.md)\>

Defined in: [types.ts:34](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L34)

Constructor for Port branded type with validation.

## Param

The port number (1-65535)

## Returns

A validated Port branded value

## Throws

Brand error if port is not a valid port number (1-65535)

## Example

```typescript
const https = Port(443); // Valid
const http = Port(80); // Valid
Port(0); // Throws: Invalid port
Port(70000); // Throws: Invalid port
```
