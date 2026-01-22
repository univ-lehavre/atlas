# Type Alias: Host

> **Host** = [`Hostname`](Hostname.md) \| [`IpAddress`](IpAddress.md)

Defined in: [types.ts:73](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L73)

Union type for host parameter.
Accepts either a `Hostname` or `IpAddress` branded type.
Used in function signatures that accept both hostnames and IP addresses.

## Example

```typescript
// Both are valid Host values
const host1: Host = Hostname('example.com');
const host2: Host = IpAddress('192.168.1.1');
```
