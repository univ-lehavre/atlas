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
 *
 * @example
 * ```typescript
 * import { Effect, pipe } from 'effect';
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
 */

export {
  // Types
  type DiagnosticStatus,
  type DiagnosticStep,
  type DiagnosticResult,
  type TcpPingOptions,
  type TlsHandshakeOptions,
  // Functions
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
} from './diagnostics.js';
