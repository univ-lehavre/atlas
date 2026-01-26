# Variable: Hostname

> **Hostname**: `Constructor`\<[`Hostname`](../type-aliases/Hostname.md)\>

Defined in: [types.ts:59](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/net/src/types.ts#L59)

Constructor for Hostname branded type with validation.

Validates hostnames according to RFC 1123. Also accepts valid IP addresses
as hostnames (useful when a URL hostname could be either a domain or IP).

## Param

The hostname string to validate

## Returns

A validated Hostname branded value

## Throws

Brand error if string is not a valid hostname (RFC 1123) or IP address

## Example

```typescript
const domain = Hostname('example.com');     // Valid domain
const sub = Hostname('api.example.com');    // Valid subdomain
const local = Hostname('localhost');        // Valid single-label
const ip = Hostname('192.168.1.1');         // Valid (IP as hostname)
Hostname('');                               // Throws: Invalid hostname
Hostname('-invalid.com');                   // Throws: Invalid hostname
```
