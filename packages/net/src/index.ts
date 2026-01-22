/**
 * @module @univ-lehavre/atlas-net
 * @description Network diagnostic utilities for Atlas CLI tools.
 *
 * This package provides low-level network diagnostic functions wrapped in Effect
 * for functional error handling. It is used by the CLI tools to diagnose
 * connectivity issues between services.
 *
 * ## Features
 *
 * - **DNS Resolution**: Check if hostnames can be resolved
 * - **TCP Ping**: Test if a port is open and reachable
 * - **TLS Handshake**: Verify SSL/TLS certificates and connectivity
 * - **Internet Check**: Quick connectivity test to public DNS
 * - **Branded Types**: Type-safe network values (IpAddress, Port, TimeoutMs)
 * - **Constants**: Default timeouts and network configuration
 *
 * ## Exports
 *
 * ### Functions
 * - `dnsResolve(hostname)` - Resolve hostname to IP address
 * - `tcpPing(host, port, options?)` - Test TCP connectivity
 * - `tlsHandshake(host, port, options?)` - Test TLS/SSL connectivity
 * - `checkInternet(options?)` - Quick internet connectivity check
 *
 * ### Types
 * - `DiagnosticStatus` - 'ok' | 'error' | 'skipped'
 * - `DiagnosticStep` - Result of a single diagnostic step
 * - `DiagnosticResult` - Aggregated diagnostic results
 * - `TcpPingOptions` - Options for TCP ping
 * - `TlsHandshakeOptions` - Options for TLS handshake
 *
 * ### Branded Types
 * - `TimeoutMs` - Validated timeout in milliseconds (0-600000)
 * - `Port` - Validated port number (1-65535)
 * - `IpAddress` - Validated IPv4 or IPv6 address
 *
 * ### Constants
 * - `DEFAULT_TCP_TIMEOUT_MS` - Default TCP timeout (3000ms)
 * - `DEFAULT_TLS_TIMEOUT_MS` - Default TLS timeout (5000ms)
 * - `DEFAULT_INTERNET_CHECK_TIMEOUT_MS` - Default internet check timeout (5000ms)
 * - `INTERNET_CHECK_HOST` - Host for internet checks (1.1.1.1)
 * - `HTTPS_PORT` - Standard HTTPS port (443)
 *
 * @example
 * ```typescript
 * import { Effect } from 'effect';
 * import {
 *   dnsResolve,
 *   tcpPing,
 *   tlsHandshake,
 *   checkInternet,
 *   type DiagnosticStep,
 * } from '@univ-lehavre/atlas-net';
 *
 * // Run a full connectivity diagnostic
 * const diagnose = (host: string, port: number) =>
 *   Effect.all([
 *     checkInternet(),
 *     dnsResolve(host),
 *     tcpPing(host, port),
 *     tlsHandshake(host, port),
 *   ]);
 *
 * const steps = await Effect.runPromise(diagnose('example.com', 443));
 * steps.forEach(step => {
 *   console.log(`${step.name}: ${step.status} (${step.latencyMs}ms)`);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using branded types for type-safe values
 * import { IpAddress, Port, TimeoutMs } from '@univ-lehavre/atlas-net';
 *
 * const ip = IpAddress('192.168.1.1');     // Validated IP
 * const port = Port(8080);                  // Validated port
 * const timeout = TimeoutMs(5000);          // Validated timeout
 *
 * // These will throw at runtime:
 * // IpAddress('invalid')    // Error: Invalid IP address
 * // Port(70000)             // Error: Invalid port
 * // TimeoutMs(-1)           // Error: Invalid timeout
 * ```
 */

export {
  // Diagnostic Types
  type DiagnosticStatus,
  type DiagnosticStep,
  type DiagnosticResult,
  type TcpPingOptions,
  type TlsHandshakeOptions,
} from './types.js';

export {
  // Branded Types
  IpAddress,
  Port,
  TimeoutMs,
} from './brands.js';

export {
  // Constants
  DEFAULT_TCP_TIMEOUT_MS,
  DEFAULT_TLS_TIMEOUT_MS,
  DEFAULT_INTERNET_CHECK_TIMEOUT_MS,
  INTERNET_CHECK_HOST,
  HTTPS_PORT,
} from './constants.js';

export {
  // Functions
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
} from './diagnostics.js';
