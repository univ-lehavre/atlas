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

## API

### `dnsResolve(hostname)`

Resolves a hostname to an IP address using DNS lookup.

### `tcpPing(host, port, options?)`

Tests TCP connectivity to a host and port.

Options:

- `name`: Custom name for the diagnostic step (default: 'TCP Connect')
- `timeoutMs`: Connection timeout in milliseconds (default: 3000)

### `tlsHandshake(host, port, options?)`

Tests TLS/SSL connectivity and validates the server certificate.

Options:

- `timeoutMs`: Handshake timeout in milliseconds (default: 5000)
- `rejectUnauthorized`: Whether to reject unauthorized certificates (default: true)

### `checkInternet(options?)`

Checks basic internet connectivity by pinging Cloudflare's DNS server (1.1.1.1).

## Types

### `DiagnosticStep`

```typescript
interface DiagnosticStep {
  name: string;
  status: 'ok' | 'error' | 'skipped';
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

## License

MIT
