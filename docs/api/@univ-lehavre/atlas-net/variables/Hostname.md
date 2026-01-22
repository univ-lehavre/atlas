# Variable: Hostname

> **Hostname**: `Constructor`\<[`Hostname`](../type-aliases/Hostname.md)\>

Defined in: [types.ts:59](https://github.com/univ-lehavre/atlas/blob/d53e1a534f87e749e0d344418b61514be7d9d0ba/packages/net/src/types.ts#L59)

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
const domain = Hostname('example.com'); // Valid domain
const sub = Hostname('api.example.com'); // Valid subdomain
const local = Hostname('localhost'); // Valid single-label
const ip = Hostname('192.168.1.1'); // Valid (IP as hostname)
Hostname(''); // Throws: Invalid hostname
Hostname('-invalid.com'); // Throws: Invalid hostname
```
