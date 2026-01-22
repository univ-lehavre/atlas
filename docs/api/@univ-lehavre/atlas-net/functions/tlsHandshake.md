# Function: tlsHandshake()

> **tlsHandshake**(`host`, `port`, `options`): `Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

Defined in: [diagnostics.ts:187](https://github.com/univ-lehavre/atlas/blob/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e/packages/net/src/diagnostics.ts#L187)

Tests TLS/SSL connectivity and validates the server certificate.

Performs a TLS handshake and retrieves certificate information including
the Common Name (CN) and expiration date. Useful for diagnosing HTTPS
connectivity issues and certificate problems.

## Parameters

### host

`string`

The hostname to connect to

### port

`number`

The port number (typically 443 for HTTPS)

### options

[`TlsHandshakeOptions`](../interfaces/TlsHandshakeOptions.md) = `{}`

Optional configuration for the handshake operation

## Returns

`Effect`\<[`DiagnosticStep`](../interfaces/DiagnosticStep.md)\>

An Effect that resolves to a DiagnosticStep with certificate info or error

## Example

```typescript
// Check TLS connectivity and certificate
const step = await Effect.runPromise(tlsHandshake('example.com', 443));
if (step.status === 'ok') {
  console.log(`Certificate: ${step.message}`);
}

// Allow self-signed certificates
const step2 = await Effect.runPromise(
  tlsHandshake('internal-server.local', 443, { rejectUnauthorized: false })
);
```
