# @univ-lehavre/atlas-net

Network diagnostic utilities for Atlas CLI tools, built with [Effect](https://effect.website/).

## Installation

```bash
pnpm add @univ-lehavre/atlas-net effect
```

## Features

- **DNS Resolution**: Check if hostnames can be resolved
- **TCP Ping**: Test if a port is open and reachable
- **TLS Handshake**: Verify SSL/TLS certificates and connectivity
- **Internet Check**: Quick connectivity test to public DNS
- **Branded Types**: Type-safe network values with runtime validation
- **Constants**: Default timeouts and network configuration

## Usage

```typescript
import { Effect } from 'effect';
import {
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
  type DiagnosticStep,
} from '@univ-lehavre/atlas-net';

// Check internet connectivity
const internet = await Effect.runPromise(checkInternet());
console.log(`Internet: ${internet.status}`);

// Resolve hostname
const dns = await Effect.runPromise(dnsResolve('example.com'));
console.log(`DNS: ${dns.status} -> ${dns.message}`);

// Test TCP connection
const tcp = await Effect.runPromise(tcpPing('example.com', 443));
console.log(`TCP: ${tcp.status} (${tcp.latencyMs}ms)`);

// Verify TLS certificate
const tls = await Effect.runPromise(tlsHandshake('example.com', 443));
console.log(`TLS: ${tls.status} - ${tls.message}`);
```

### Full Diagnostic Pipeline

```typescript
import { Effect } from 'effect';
import { dnsResolve, tcpPing, tlsHandshake, checkInternet } from '@univ-lehavre/atlas-net';

const diagnose = (host: string, port: number) =>
  Effect.all([checkInternet(), dnsResolve(host), tcpPing(host, port), tlsHandshake(host, port)]);

const steps = await Effect.runPromise(diagnose('example.com', 443));
steps.forEach((step) => {
  console.log(`${step.name}: ${step.status} (${step.latencyMs}ms)`);
});
```

## Branded Types

The package provides type-safe branded types with runtime validation using Effect's Brand module.

```typescript
import { IpAddress, Port, TimeoutMs } from '@univ-lehavre/atlas-net';

// Create validated values
const ip = IpAddress('192.168.1.1'); // Validated IPv4 address
const ipv6 = IpAddress('::1'); // Validated IPv6 address
const port = Port(8080); // Validated port (1-65535)
const timeout = TimeoutMs(5000); // Validated timeout (0-600000ms)

// These will throw at runtime with descriptive errors:
// IpAddress('invalid')    // Error: Invalid IP address format
// Port(70000)             // Error: Invalid port number
// TimeoutMs(-1)           // Error: Invalid timeout value
```

### `IpAddress`

Validated IPv4 or IPv6 address string.

- IPv4: `192.168.1.1`, `10.0.0.1`
- IPv6: `::1`, `2001:db8::1`, `fe80::1`

### `Port`

Validated port number between 1 and 65535.

### `TimeoutMs`

Validated timeout in milliseconds between 0 and 600000 (10 minutes).

## Constants

Pre-defined constants for common network configurations:

```typescript
import {
  DEFAULT_TCP_TIMEOUT_MS, // 3000ms
  DEFAULT_TLS_TIMEOUT_MS, // 5000ms
  DEFAULT_INTERNET_CHECK_TIMEOUT_MS, // 5000ms
  INTERNET_CHECK_HOST, // '1.1.1.1' (Cloudflare DNS)
  HTTPS_PORT, // 443
} from '@univ-lehavre/atlas-net';
```

## API

### `dnsResolve(hostname)`

Resolves a hostname to an IP address using DNS lookup.

```typescript
const step = await Effect.runPromise(dnsResolve('example.com'));
if (step.status === 'ok') {
  console.log(`Resolved to ${step.message}`);
}
```

### `tcpPing(host, port, options?)`

Tests TCP connectivity to a host and port.

Options:

- `name`: Custom name for the diagnostic step (default: `'TCP Connect'`)
- `timeoutMs`: Connection timeout in milliseconds (default: `3000`)

```typescript
const step = await Effect.runPromise(tcpPing('example.com', 443, { timeoutMs: 10000 }));
```

### `tlsHandshake(host, port, options?)`

Tests TLS/SSL connectivity and validates the server certificate.

Options:

- `timeoutMs`: Handshake timeout in milliseconds (default: `5000`)
- `rejectUnauthorized`: Whether to reject unauthorized certificates (default: `true`)

```typescript
// Allow self-signed certificates
const step = await Effect.runPromise(
  tlsHandshake('internal-server.local', 443, { rejectUnauthorized: false })
);
```

### `checkInternet(options?)`

Checks basic internet connectivity by pinging Cloudflare's DNS server (1.1.1.1).

```typescript
const step = await Effect.runPromise(checkInternet());
if (step.status === 'ok') {
  console.log('Internet is available');
}
```

## Types

### `DiagnosticStatus`

```typescript
type DiagnosticStatus = 'ok' | 'error' | 'skipped';
```

### `DiagnosticStep`

```typescript
interface DiagnosticStep {
  name: string;
  status: DiagnosticStatus;
  latencyMs?: number;
  message?: string;
}
```

### `DiagnosticResult`

```typescript
interface DiagnosticResult {
  steps: readonly DiagnosticStep[];
  overallStatus: 'ok' | 'partial' | 'error';
}
```

### `TcpPingOptions`

```typescript
interface TcpPingOptions {
  name?: string;
  timeoutMs?: number;
}
```

### `TlsHandshakeOptions`

```typescript
interface TlsHandshakeOptions {
  timeoutMs?: number;
  rejectUnauthorized?: boolean;
}
```

## License

MIT
