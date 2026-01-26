# Function: tlsHandshake()

> **tlsHandshake**(`host`, `port`, `options`): `Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

Defined in: [diagnostics.ts:209](https://github.com/univ-lehavre/atlas/blob/067e8421c3433ceb323de771c4474cc290439004/packages/net/src/diagnostics.ts#L209)

Tests TLS/SSL connectivity and validates the server certificate.

Performs a TLS handshake and retrieves certificate information including
the Common Name (CN) and expiration date. Useful for diagnosing HTTPS
connectivity issues and certificate problems.

## Parameters

### host

[`Host`](../type-aliases/Host.md)

A validated `Host` type (`Hostname` or `IpAddress`)

### port

[`Port`](../type-aliases/Port.md)

A validated `Port` branded type (typically 443 for HTTPS)

### options

[`TlsHandshakeOptions`](../interfaces/TlsHandshakeOptions.md) = `{}`

Optional configuration including `timeoutMs` (as `TimeoutMs`) and `rejectUnauthorized`

## Returns

`Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

An Effect that resolves to a DiagnosticStep with certificate info or error

## Example

```typescript
import { Hostname, Port } from '@univ-lehavre/atlas-net';

// Check TLS connectivity and certificate
const step = await Effect.runPromise(tlsHandshake(Hostname('example.com'), Port(443)));
if (step.status === 'ok') {
  console.log(`Certificate: ${step.message}`);
}

// Allow self-signed certificates
const step2 = await Effect.runPromise(
  tlsHandshake(Hostname('internal-server.local'), Port(443), { rejectUnauthorized: false })
);
```
