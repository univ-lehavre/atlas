/* eslint-disable functional/no-let, functional/no-expression-statements, functional/no-conditional-statements, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, unicorn/no-negated-condition -- Network callbacks require imperative code */
/**
 * Network diagnostic functions for connectivity testing
 */

import * as dns from 'node:dns';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { Effect } from 'effect';

// ============================================================================
// Types
// ============================================================================

export type DiagnosticStatus = 'ok' | 'error' | 'skipped';

export interface DiagnosticStep {
  readonly name: string;
  readonly status: DiagnosticStatus;
  readonly latencyMs?: number;
  readonly message?: string;
}

export interface DiagnosticResult {
  readonly steps: readonly DiagnosticStep[];
  readonly overallStatus: 'ok' | 'partial' | 'error';
}

// ============================================================================
// DNS Resolution
// ============================================================================

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

export interface TcpPingOptions {
  readonly name?: string;
  readonly timeoutMs?: number;
}

export const tcpPing = (
  host: string,
  port: number,
  options: TcpPingOptions = {}
): Effect.Effect<DiagnosticStep> =>
  Effect.async<DiagnosticStep>((resume) => {
    const { name = 'TCP Connect', timeoutMs = 3000 } = options;
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

export interface TlsHandshakeOptions {
  readonly timeoutMs?: number;
  readonly rejectUnauthorized?: boolean;
}

export const tlsHandshake = (
  host: string,
  port: number,
  options: TlsHandshakeOptions = {}
): Effect.Effect<DiagnosticStep> =>
  Effect.async<DiagnosticStep>((resume) => {
    const { timeoutMs = 5000, rejectUnauthorized = true } = options;
    const start = Date.now();

    const socket = tls.connect(
      {
        host,
        port,
        rejectUnauthorized,
        timeout: timeoutMs,
      },
      () => {
        const latencyMs = Date.now() - start;
        const cert = socket.getPeerCertificate();
        const validTo = cert.valid_to !== '' ? new Date(cert.valid_to) : null;
        const daysLeft = validTo
          ? Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        const cn = cert.subject ? cert.subject.CN : null;
        let message = cn ?? 'Certificate valid';
        if (daysLeft !== null && daysLeft < 30) {
          message += ` (expires in ${String(daysLeft)} days)`;
        }

        socket.destroy();
        resume(
          Effect.succeed({
            name: 'TLS Handshake',
            status: 'ok',
            latencyMs,
            message,
          })
        );
      }
    );

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
      const message =
        err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
          ? 'Certificate not trusted (self-signed?)'
          : err.code === 'CERT_HAS_EXPIRED'
            ? 'Certificate has expired'
            : err.code === 'ERR_TLS_CERT_ALTNAME_INVALID'
              ? 'Certificate hostname mismatch'
              : err.message;
      resume(
        Effect.succeed({
          name: 'TLS Handshake',
          status: 'error',
          latencyMs: Date.now() - start,
          message,
        })
      );
    });
  });

// ============================================================================
// Internet Connectivity Check
// ============================================================================

export const checkInternet = (options: TcpPingOptions = {}): Effect.Effect<DiagnosticStep> =>
  tcpPing('1.1.1.1', 443, { name: 'Internet Check', timeoutMs: 5000, ...options });
/* eslint-enable functional/no-let, functional/no-expression-statements, functional/no-conditional-statements, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, unicorn/no-negated-condition */
