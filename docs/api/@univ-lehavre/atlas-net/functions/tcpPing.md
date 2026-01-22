# Function: tcpPing()

> **tcpPing**(`host`, `port`, `options`): `Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

Defined in: [diagnostics.ts:121](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/diagnostics.ts#L121)

Tests TCP connectivity to a host and port.

Attempts to establish a TCP connection and measures the time taken.
This is useful for checking if a port is open and reachable.

## Parameters

### host

`string`

The hostname or IP address to connect to

### port

`number`

The port number to connect to

### options

[`TcpPingOptions`](../interfaces/TcpPingOptions.md) = `{}`

Optional configuration for the ping operation

## Returns

`Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

An Effect that resolves to a DiagnosticStep with connection status

## Example

```typescript
// Check if a web server is reachable
const step = await Effect.runPromise(tcpPing('example.com', 443));
console.log(`Connection ${step.status} in ${step.latencyMs}ms`);

// With custom timeout
const step2 = await Effect.runPromise(tcpPing('slow-server.com', 8080, { timeoutMs: 10000 }));
```
