# Variable: IpAddress

> **IpAddress**: `Constructor`\<[`IpAddress`](../type-aliases/IpAddress.md)\>

Defined in: [types.ts:46](https://github.com/univ-lehavre/atlas/blob/48acc16c89a79209d3be1763a73e3e9607aa38aa/packages/net/src/types.ts#L46)

Constructor for IpAddress branded type with validation.

## Param

The IP address string to validate

## Returns

A validated IpAddress branded value

## Throws

Brand error if string is not a valid IPv4 or IPv6 address

## Example

```typescript
const ipv4 = IpAddress('192.168.1.1');  // Valid IPv4
const ipv6 = IpAddress('::1');          // Valid IPv6
IpAddress('invalid');                   // Throws: Invalid IP address
IpAddress('256.1.1.1');                 // Throws: Invalid IP address
```
