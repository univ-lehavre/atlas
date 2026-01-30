# @univ-lehavre/atlas-net

Network diagnostic utilities for Atlas, built with [Effect](https://effect.website/).

## About

This package provides typed and functional network diagnostic tools for Atlas applications. It is used by CLI tools to verify connectivity to REDCap servers and other services.

## Features

- **DNS Resolution**: Verify hostname resolution
- **TCP Ping**: Test if a port is open and accessible
- **TLS Handshake**: Verify SSL/TLS certificates
- **Internet Check**: Quick connectivity test
- **Branded Types**: Typed network values with runtime validation
- **Constants**: Default timeouts and network configuration

## Installation

```bash
pnpm add @univ-lehavre/atlas-net effect
```

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
} from '@univ-lehavre/atlas-net';

// Check Internet connectivity
const internet = await Effect.runPromise(checkInternet());
console.log(`Internet: ${internet.status}`);

// Resolve a hostname
const hostname = Hostname('example.com');
const dns = await Effect.runPromise(dnsResolve(hostname));
console.log(`DNS: ${dns.status} -> ${dns.message}`);

// Test TCP connection
const port = Port(443);
const tcp = await Effect.runPromise(tcpPing(hostname, port));
console.log(`TCP: ${tcp.status} (${tcp.latencyMs}ms)`);

// Verify TLS certificate
const tls = await Effect.runPromise(tlsHandshake(hostname, port));
console.log(`TLS: ${tls.status} - ${tls.message}`);
```

### Complete Diagnostic Pipeline

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

The package provides branded types with runtime validation via Effect's Brand module.

```typescript
import { Hostname, IpAddress, Port, TimeoutMs, SafeApiUrl } from '@univ-lehavre/atlas-net';

// Create validated values
const hostname = Hostname('example.com'); // Validated hostname (RFC 1123)
const ip = IpAddress('192.168.1.1'); // Validated IPv4 address
const port = Port(8080); // Validated port (1-65535)
const timeout = TimeoutMs(5000); // Validated timeout (0-600000ms)
const url = SafeApiUrl('https://api.example.com/v1/'); // Secure URL
```

## API

### Functions

| Function | Description |
|----------|-------------|
| `dnsResolve(hostname)` | Resolves a hostname to an IP address |
| `tcpPing(host, port, options?)` | Tests TCP connectivity |
| `tlsHandshake(host, port, options?)` | Verifies TLS certificate |
| `checkInternet(options?)` | Checks Internet connectivity |

### Types

| Type | Description |
|------|-------------|
| `Hostname` | RFC 1123 validated hostname or IP address |
| `IpAddress` | Validated IPv4 or IPv6 address |
| `Port` | Port number (1-65535) |
| `TimeoutMs` | Timeout in milliseconds (0-600000) |
| `SafeApiUrl` | Secure URL for API communication |
| `DiagnosticStep` | Result of a diagnostic step |

### Constants

```typescript
import {
  DEFAULT_TCP_TIMEOUT_MS, // 3000ms
  DEFAULT_TLS_TIMEOUT_MS, // 5000ms
  INTERNET_CHECK_HOST, // '1.1.1.1' (Cloudflare DNS)
  HTTPS_PORT, // 443
} from '@univ-lehavre/atlas-net';
```

## Documentation

- [API Documentation](../../docs/api/@univ-lehavre/atlas-net/)

## Organization

This package is part of **Atlas**, a set of tools developed by **Le Havre Normandie University** to facilitate research and collaboration between researchers.

Atlas is developed as part of two projects led by Le Havre Normandie University:

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)**: research and training program focused on maritime and port issues
- **[EUNICoast](https://eunicoast.eu/)**: European university alliance bringing together institutions located in European coastal areas

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Le Havre Normandie University" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="../logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="../logos/eunicoast.png" alt="EUNICoast" height="20">
  </a>
</p>

## License

MIT
