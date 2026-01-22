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
  Hostname,
  Port,
  type DiagnosticStep,
} from '@univ-lehavre/atlas-net';

// Check internet connectivity
const internet = await Effect.runPromise(checkInternet());
console.log(`Internet: ${internet.status}`);

// Resolve hostname (requires Hostname branded type)
const hostname = Hostname('example.com');
const dns = await Effect.runPromise(dnsResolve(hostname));
console.log(`DNS: ${dns.status} -> ${dns.message}`);

// Test TCP connection (requires Hostname/IpAddress and Port branded types)
const port = Port(443);
const tcp = await Effect.runPromise(tcpPing(hostname, port));
console.log(`TCP: ${tcp.status} (${tcp.latencyMs}ms)`);

// Verify TLS certificate
const tls = await Effect.runPromise(tlsHandshake(hostname, port));
console.log(`TLS: ${tls.status} - ${tls.message}`);
```

### Full Diagnostic Pipeline

```typescript
import { Effect } from 'effect';
import {
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
  Hostname,
  Port,
} from '@univ-lehavre/atlas-net';

const diagnose = (host: Hostname, port: Port) =>
  Effect.all([checkInternet(), dnsResolve(host), tcpPing(host, port), tlsHandshake(host, port)]);

const steps = await Effect.runPromise(diagnose(Hostname('example.com'), Port(443)));
steps.forEach((step) => {
  console.log(`${step.name}: ${step.status} (${step.latencyMs}ms)`);
});
```

## Branded Types

The package provides type-safe branded types with runtime validation using Effect's Brand module.

```typescript
import { Hostname, IpAddress, Port, TimeoutMs } from '@univ-lehavre/atlas-net';

// Create validated values
const hostname = Hostname('example.com'); // Validated hostname (RFC 1123)
const ip = IpAddress('192.168.1.1'); // Validated IPv4 address
const ipv6 = IpAddress('::1'); // Validated IPv6 address
const port = Port(8080); // Validated port (1-65535)
const timeout = TimeoutMs(5000); // Validated timeout (0-600000ms)

// These will throw at runtime with descriptive errors:
// Hostname('')            // Error: Invalid hostname
// Hostname('-invalid')    // Error: Invalid hostname (can't start with hyphen)
// IpAddress('invalid')    // Error: Invalid IP address format
// Port(70000)             // Error: Invalid port number
// TimeoutMs(-1)           // Error: Invalid timeout value
```

### `Hostname`

Validated hostname according to RFC 1123, or a valid IP address.

- Hostnames: `example.com`, `sub.domain.org`, `localhost`
- IP addresses are also accepted: `192.168.1.1`, `::1`

### `IpAddress`

Validated IPv4 or IPv6 address string.

- IPv4: `192.168.1.1`, `10.0.0.1`
- IPv6: `::1`, `2001:db8::1`, `fe80::1`

### `Host`

Union type accepting either `Hostname` or `IpAddress`. Used in function parameters that accept both.

### `Port`

Validated port number between 1 and 65535.

### `TimeoutMs`

Validated timeout in milliseconds between 0 and 600000 (10 minutes).

### `SafeApiUrl`

Validated URL for API communication with security checks:

- Valid URL format parseable by the URL constructor
- HTTP or HTTPS protocol only
- No embedded credentials (username/password in URL)
- Non-empty hostname
- No query string parameters
- No URL fragments

```typescript
import { SafeApiUrl } from '@univ-lehavre/atlas-net';

const url = SafeApiUrl('https://api.example.com/v1/');

// These will throw:
// SafeApiUrl('ftp://example.com')           // Wrong protocol
// SafeApiUrl('https://user:pass@example.com') // Credentials in URL
// SafeApiUrl('https://example.com?token=x') // Query string not allowed
```

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

### `dnsResolve(hostname: Hostname)`

Resolves a hostname to an IP address using DNS lookup.

```typescript
const step = await Effect.runPromise(dnsResolve(Hostname('example.com')));
if (step.status === 'ok') {
  console.log(`Resolved to ${step.message}`);
}
```

### `tcpPing(host: Host, port: Port, options?)`

Tests TCP connectivity to a host and port. Accepts `Hostname` or `IpAddress` as the host parameter.

Options:

- `name`: Custom name for the diagnostic step (default: `'TCP Connect'`)
- `timeoutMs`: Connection timeout as `TimeoutMs` (default: `3000`)

```typescript
const step = await Effect.runPromise(
  tcpPing(Hostname('example.com'), Port(443), { timeoutMs: TimeoutMs(10000) })
);
```

### `tlsHandshake(host: Host, port: Port, options?)`

Tests TLS/SSL connectivity and validates the server certificate. Accepts `Hostname` or `IpAddress` as the host parameter.

Options:

- `timeoutMs`: Handshake timeout as `TimeoutMs` (default: `5000`)
- `rejectUnauthorized`: Whether to reject unauthorized certificates (default: `true`)

```typescript
// Allow self-signed certificates
const step = await Effect.runPromise(
  tlsHandshake(Hostname('internal-server.local'), Port(443), { rejectUnauthorized: false })
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
  timeoutMs?: TimeoutMs;
}
```

### `TlsHandshakeOptions`

```typescript
interface TlsHandshakeOptions {
  timeoutMs?: TimeoutMs;
  rejectUnauthorized?: boolean;
}
```

## License

MIT
