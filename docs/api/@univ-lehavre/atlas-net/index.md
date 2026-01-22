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

## Description

Network diagnostic utilities for Atlas CLI tools.

This package provides low-level network diagnostic functions wrapped in Effect
for functional error handling. It is used by the CLI tools to diagnose
connectivity issues between services.

## Features

- **DNS Resolution**: Check if hostnames can be resolved
- **TCP Ping**: Test if a port is open and reachable
- **TLS Handshake**: Verify SSL/TLS certificates and connectivity
- **Internet Check**: Quick connectivity test to public DNS
- **Branded Types**: Type-safe network values (IpAddress, Port, TimeoutMs)
- **Constants**: Default timeouts and network configuration

## Exports

### Functions

- `dnsResolve(hostname)` - Resolve hostname to IP address
- `tcpPing(host, port, options?)` - Test TCP connectivity
- `tlsHandshake(host, port, options?)` - Test TLS/SSL connectivity
- `checkInternet(options?)` - Quick internet connectivity check

### Types

- `DiagnosticStatus` - 'ok' | 'error' | 'skipped'
- `DiagnosticStep` - Result of a single diagnostic step
- `DiagnosticResult` - Aggregated diagnostic results
- `TcpPingOptions` - Options for TCP ping
- `TlsHandshakeOptions` - Options for TLS handshake

### Branded Types

- `TimeoutMs` - Validated timeout in milliseconds (0-600000)
- `Port` - Validated port number (1-65535)
- `IpAddress` - Validated IPv4 or IPv6 address

### Constants

- `DEFAULT_TCP_TIMEOUT_MS` - Default TCP timeout (3000ms)
- `DEFAULT_TLS_TIMEOUT_MS` - Default TLS timeout (5000ms)
- `DEFAULT_INTERNET_CHECK_TIMEOUT_MS` - Default internet check timeout (5000ms)
- `INTERNET_CHECK_HOST` - Host for internet checks (1.1.1.1)
- `HTTPS_PORT` - Standard HTTPS port (443)

## Examples

```typescript
import { Effect } from 'effect';
import {
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
  type DiagnosticStep,
} from '@univ-lehavre/atlas-net';

// Run a full connectivity diagnostic
const diagnose = (host: string, port: number) =>
  Effect.all([checkInternet(), dnsResolve(host), tcpPing(host, port), tlsHandshake(host, port)]);

const steps = await Effect.runPromise(diagnose('example.com', 443));
steps.forEach((step) => {
  console.log(`${step.name}: ${step.status} (${step.latencyMs}ms)`);
});
```

```typescript
// Using branded types for type-safe values
import { IpAddress, Port, TimeoutMs } from '@univ-lehavre/atlas-net';

const ip = IpAddress('192.168.1.1'); // Validated IP
const port = Port(8080); // Validated port
const timeout = TimeoutMs(5000); // Validated timeout

// These will throw at runtime:
// IpAddress('invalid')    // Error: Invalid IP address
// Port(70000)             // Error: Invalid port
// TimeoutMs(-1)           // Error: Invalid timeout
```

## Interfaces

| Interface                                                | Description                                     |
| -------------------------------------------------------- | ----------------------------------------------- |
| [DiagnosticResult](interfaces/DiagnosticResult.md)       | Aggregated result of multiple diagnostic steps. |
| [DiagnosticStep](interfaces/DiagnosticStep.md)           | Result of a single diagnostic step.             |
| [TcpPingOptions](interfaces/TcpPingOptions.md)           | Options for TCP ping operation.                 |
| [TlsHandshakeOptions](interfaces/TlsHandshakeOptions.md) | Options for TLS handshake operation.            |

## Type Aliases

| Type Alias                                           | Description                                      |
| ---------------------------------------------------- | ------------------------------------------------ |
| [DiagnosticStatus](type-aliases/DiagnosticStatus.md) | Status of a diagnostic step.                     |
| [IpAddress](type-aliases/IpAddress.md)               | Branded type for IP addresses.                   |
| [Port](type-aliases/Port.md)                         | Branded type for port numbers.                   |
| [TimeoutMs](type-aliases/TimeoutMs.md)               | Branded type for timeout values in milliseconds. |

## Variables

| Variable                                                                            | Description                                                       |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [DEFAULT_INTERNET_CHECK_TIMEOUT_MS](variables/DEFAULT_INTERNET_CHECK_TIMEOUT_MS.md) | Default timeout for internet connectivity checks in milliseconds. |
| [DEFAULT_TCP_TIMEOUT_MS](variables/DEFAULT_TCP_TIMEOUT_MS.md)                       | Default timeout for TCP connections in milliseconds.              |
| [DEFAULT_TLS_TIMEOUT_MS](variables/DEFAULT_TLS_TIMEOUT_MS.md)                       | Default timeout for TLS handshakes in milliseconds.               |
| [HTTPS_PORT](variables/HTTPS_PORT.md)                                               | Standard HTTPS port.                                              |
| [INTERNET_CHECK_HOST](variables/INTERNET_CHECK_HOST.md)                             | Host used for internet connectivity checks (Cloudflare DNS).      |
| [IpAddress](variables/IpAddress.md)                                                 | Constructor for IpAddress branded type with validation.           |
| [Port](variables/Port.md)                                                           | Constructor for Port branded type with validation.                |
| [TimeoutMs](variables/TimeoutMs.md)                                                 | Constructor for TimeoutMs branded type with validation.           |

## Functions

| Function                                    | Description                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| [checkInternet](functions/checkInternet.md) | Checks basic internet connectivity by pinging Cloudflare's DNS server. |
| [dnsResolve](functions/dnsResolve.md)       | Resolves a hostname to an IP address using DNS lookup.                 |
| [tcpPing](functions/tcpPing.md)             | Tests TCP connectivity to a host and port.                             |
| [tlsHandshake](functions/tlsHandshake.md)   | Tests TLS/SSL connectivity and validates the server certificate.       |
