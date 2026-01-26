# Variable: SafeApiUrl

> **SafeApiUrl**: `Constructor`\<[`SafeApiUrl`](../type-aliases/SafeApiUrl.md)\>

Defined in: [types.ts:323](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/net/src/types.ts#L323)

Constructor for SafeApiUrl branded type with validation.

## Param

The URL string to validate and brand

## Returns

A validated SafeApiUrl branded value

## Throws

When the URL is invalid or fails security checks

## Example

```typescript
const apiUrl = SafeApiUrl('https://api.example.com/v1/');
SafeApiUrl('ftp://example.com');  // Throws: Invalid safe API URL
```
