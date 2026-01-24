# Type Alias: IpAddress

> **IpAddress** = `string` & `Brand.Brand`\<`"IpAddress"`\>

Defined in: [types.ts:46](https://github.com/univ-lehavre/atlas/blob/48acc16c89a79209d3be1763a73e3e9607aa38aa/packages/net/src/types.ts#L46)

Branded type for IP addresses.
Accepts valid IPv4 (e.g., '192.168.1.1') or IPv6 (e.g., '::1') addresses.

## Example

```typescript
const ipv4 = IpAddress('192.168.1.1');
const ipv6 = IpAddress('::1');
```
