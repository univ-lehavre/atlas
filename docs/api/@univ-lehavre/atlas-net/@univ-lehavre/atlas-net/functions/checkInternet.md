# Function: checkInternet()

> **checkInternet**(`options`): `Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

Defined in: [diagnostics.ts:273](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/net/src/diagnostics.ts#L273)

Checks basic internet connectivity by pinging Cloudflare's DNS server.

This is a quick check to verify that the machine has internet access.
It connects to Cloudflare's public DNS (1.1.1.1) on port 443.

## Parameters

### options

[`TcpPingOptions`](../interfaces/TcpPingOptions.md) = `{}`

Optional TCP ping configuration

## Returns

`Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

An Effect that resolves to a DiagnosticStep indicating internet connectivity

## Example

```typescript
const step = await Effect.runPromise(checkInternet());
if (step.status === 'ok') {
  console.log('Internet is available');
} else {
  console.log('No internet connection');
}
```
