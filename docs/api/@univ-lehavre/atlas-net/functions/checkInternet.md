# Function: checkInternet()

> **checkInternet**(`options`): `Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

Defined in: [diagnostics.ts:251](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/diagnostics.ts#L251)

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
