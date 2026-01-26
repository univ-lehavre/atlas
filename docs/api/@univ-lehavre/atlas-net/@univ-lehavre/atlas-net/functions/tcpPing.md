# Function: tcpPing()

> **tcpPing**(`host`, `port`, `options`): `Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

Defined in: [diagnostics.ts:141](https://github.com/univ-lehavre/atlas/blob/45d422725947bfe2a93b0baafcbbb59a4d8190f9/packages/net/src/diagnostics.ts#L141)

Tests TCP connectivity to a host and port.

Attempts to establish a TCP connection and measures the time taken.
This is useful for checking if a port is open and reachable.

## Parameters

### host

[`Host`](../type-aliases/Host.md)

A validated `Host` type (`Hostname` or `IpAddress`)

### port

[`Port`](../type-aliases/Port.md)

A validated `Port` branded type (1-65535)

### options

[`TcpPingOptions`](../interfaces/TcpPingOptions.md) = `{}`

Optional configuration including `name` and `timeoutMs` (as `TimeoutMs`)

## Returns

`Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

An Effect that resolves to a DiagnosticStep with connection status

## Example

```typescript
import { Hostname, Port, TimeoutMs } from '@univ-lehavre/atlas-net';

// Check if a web server is reachable
const step = await Effect.runPromise(tcpPing(Hostname('example.com'), Port(443)));
console.log(`Connection ${step.status} in ${step.latencyMs}ms`);

// With custom timeout
const step2 = await Effect.runPromise(
  tcpPing(Hostname('slow-server.com'), Port(8080), { timeoutMs: TimeoutMs(10000) })
);
```
