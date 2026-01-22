/* eslint-disable functional/no-expression-statements, functional/no-conditional-statements -- Network callbacks require imperative code */
/**
 * @module diagnostics
 * @description Network diagnostic functions for connectivity testing.
 *
 * This module provides low-level network diagnostic utilities wrapped in Effect
 * for functional error handling. These functions are used by CLI tools to diagnose
 * connectivity issues between services.
 *
 * @example
 * ```typescript
 * import { Effect, pipe } from 'effect';
 * import { dnsResolve, tcpPing, tlsHandshake } from '@univ-lehavre/atlas-net';
 *
 * // Diagnose connectivity to a server
 * const diagnose = pipe(
 *   Effect.all([
 *     dnsResolve('example.com'),
 *     tcpPing('example.com', 443),
 *     tlsHandshake('example.com', 443),
 *   ]),
 *   Effect.map(steps => ({
 *     steps,
 *     overallStatus: steps.every(s => s.status === 'ok') ? 'ok' : 'error'
 *   }))
 * );
 * ```
 */

import * as dns from 'node:dns';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { Effect } from 'effect';

import {
  DEFAULT_INTERNET_CHECK_TIMEOUT_MS,
  DEFAULT_TCP_TIMEOUT_MS,
  DEFAULT_TLS_TIMEOUT_MS,
  HTTPS_PORT,
  INTERNET_CHECK_HOST,
} from './constants.js';
import { formatCertificateMessage, formatTlsErrorMessage } from './helpers.js';
import type { DiagnosticStep, TcpPingOptions, TlsHandshakeOptions } from './types.js';

// ============================================================================
// DNS Resolution
// ============================================================================

/**
 * Resolves a hostname to an IP address using DNS lookup.
 *
 * This function wraps Node's `dns.lookup` in an Effect for functional error handling.
 * It measures the time taken for DNS resolution and returns diagnostic information.
 *
 * @param hostname - The hostname to resolve (e.g., 'example.com')
 * @returns An Effect that resolves to a DiagnosticStep with the resolved IP or error
 *
 * @example
 * ```typescript
 * const step = await Effect.runPromise(dnsResolve('example.com'));
 * if (step.status === 'ok') {
 *   console.log(`Resolved to ${step.message} in ${step.latencyMs}ms`);
 * }
 * ```
 */
export const dnsResolve = (hostname: string): Effect.Effect<DiagnosticStep> =>
  Effect.async<DiagnosticStep>((resume) => {
    const start = Date.now();

    dns.lookup(hostname, (err, address) => {
      const latencyMs = Date.now() - start;
      if (err) {
        resume(
          Effect.succeed({
            name: 'DNS Resolve',
            status: 'error',
            latencyMs,
            message: err.code === 'ENOTFOUND' ? 'Hostname not found' : err.message,
          })
        );
      } else {
        resume(
          Effect.succeed({
            name: 'DNS Resolve',
            status: 'ok',
            latencyMs,
            message: address,
          })
        );
      }
    });
  });

// ============================================================================
// TCP Ping
// ============================================================================

/**
 * Tests TCP connectivity to a host and port.
 *
 * Attempts to establish a TCP connection and measures the time taken.
 * This is useful for checking if a port is open and reachable.
 *
 * @param host - The hostname or IP address to connect to
 * @param port - The port number to connect to
 * @param options - Optional configuration for the ping operation
 * @returns An Effect that resolves to a DiagnosticStep with connection status
 *
 * @example
 * ```typescript
 * // Check if a web server is reachable
 * const step = await Effect.runPromise(tcpPing('example.com', 443));
 * console.log(`Connection ${step.status} in ${step.latencyMs}ms`);
 *
 * // With custom timeout
 * const step2 = await Effect.runPromise(
 *   tcpPing('slow-server.com', 8080, { timeoutMs: 10000 })
 * );
 * ```
 */
export const tcpPing = (
  host: string,
  port: number,
  options: TcpPingOptions = {}
): Effect.Effect<DiagnosticStep> =>
  Effect.async<DiagnosticStep>((resume) => {
    const { name = 'TCP Connect', timeoutMs = DEFAULT_TCP_TIMEOUT_MS } = options;
    const start = Date.now();
    const socket = new net.Socket();

    const cleanup = (): void => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const latencyMs = Date.now() - start;
      cleanup();
      resume(Effect.succeed({ name, status: 'ok', latencyMs }));
    });

    socket.on('timeout', () => {
      cleanup();
      resume(Effect.succeed({ name, status: 'error', message: 'Connection timeout' }));
    });

    socket.on('error', (err) => {
      cleanup();
      resume(Effect.succeed({ name, status: 'error', message: err.message }));
    });

    socket.connect(port, host);
  });

// ============================================================================
// TLS Handshake
// ============================================================================

/**
 * Tests TLS/SSL connectivity and validates the server certificate.
 *
 * Performs a TLS handshake and retrieves certificate information including
 * the Common Name (CN) and expiration date. Useful for diagnosing HTTPS
 * connectivity issues and certificate problems.
 *
 * @param host - The hostname to connect to
 * @param port - The port number (typically 443 for HTTPS)
 * @param options - Optional configuration for the handshake operation
 * @returns An Effect that resolves to a DiagnosticStep with certificate info or error
 *
 * @example
 * ```typescript
 * // Check TLS connectivity and certificate
 * const step = await Effect.runPromise(tlsHandshake('example.com', 443));
 * if (step.status === 'ok') {
 *   console.log(`Certificate: ${step.message}`);
 * }
 *
 * // Allow self-signed certificates
 * const step2 = await Effect.runPromise(
 *   tlsHandshake('internal-server.local', 443, { rejectUnauthorized: false })
 * );
 * ```
 */
export const tlsHandshake = (
  host: string,
  port: number,
  options: TlsHandshakeOptions = {}
): Effect.Effect<DiagnosticStep> =>
  Effect.async<DiagnosticStep>((resume) => {
    const { timeoutMs = DEFAULT_TLS_TIMEOUT_MS, rejectUnauthorized = true } = options;
    const start = Date.now();

    const socket = tls.connect({ host, port, rejectUnauthorized, timeout: timeoutMs }, () => {
      const latencyMs = Date.now() - start;
      const message = formatCertificateMessage(socket.getPeerCertificate());
      socket.destroy();
      resume(Effect.succeed({ name: 'TLS Handshake', status: 'ok', latencyMs, message }));
    });

    socket.on('timeout', () => {
      socket.destroy();
      resume(
        Effect.succeed({
          name: 'TLS Handshake',
          status: 'error',
          latencyMs: Date.now() - start,
          message: 'Connection timeout',
        })
      );
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      socket.destroy();
      resume(
        Effect.succeed({
          name: 'TLS Handshake',
          status: 'error',
          latencyMs: Date.now() - start,
          message: formatTlsErrorMessage(err),
        })
      );
    });
  });

// ============================================================================
// Internet Connectivity Check
// ============================================================================

/**
 * Checks basic internet connectivity by pinging Cloudflare's DNS server.
 *
 * This is a quick check to verify that the machine has internet access.
 * It connects to Cloudflare's public DNS (1.1.1.1) on port 443.
 *
 * @param options - Optional TCP ping configuration
 * @returns An Effect that resolves to a DiagnosticStep indicating internet connectivity
 *
 * @example
 * ```typescript
 * const step = await Effect.runPromise(checkInternet());
 * if (step.status === 'ok') {
 *   console.log('Internet is available');
 * } else {
 *   console.log('No internet connection');
 * }
 * ```
 */
export const checkInternet = (options: TcpPingOptions = {}): Effect.Effect<DiagnosticStep> =>
  tcpPing(INTERNET_CHECK_HOST, HTTPS_PORT, {
    name: 'Internet Check',
    timeoutMs: DEFAULT_INTERNET_CHECK_TIMEOUT_MS,
    ...options,
  });
/* eslint-enable functional/no-expression-statements, functional/no-conditional-statements */
