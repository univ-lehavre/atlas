/**
 * @module types
 * @description Type definitions for network diagnostic functions.
 */

// ============================================================================
// Diagnostic Types
// ============================================================================

/**
 * Status of a diagnostic step.
 *
 * - `ok`: The check passed successfully
 * - `error`: The check failed
 * - `skipped`: The check was skipped (e.g., TLS check on non-HTTPS URL)
 */
export type DiagnosticStatus = 'ok' | 'error' | 'skipped';

/**
 * Result of a single diagnostic step.
 */
export interface DiagnosticStep {
  /** Name of the diagnostic step (e.g., 'DNS Resolve', 'TCP Connect') */
  readonly name: string;
  /** Status of the step */
  readonly status: DiagnosticStatus;
  /** Time taken in milliseconds (optional) */
  readonly latencyMs?: number;
  /** Additional information (e.g., resolved IP, error message) */
  readonly message?: string;
}

/**
 * Aggregated result of multiple diagnostic steps.
 */
export interface DiagnosticResult {
  /** Array of individual diagnostic steps */
  readonly steps: readonly DiagnosticStep[];
  /** Overall status: 'ok' if all passed, 'partial' if some passed, 'error' if all failed */
  readonly overallStatus: 'ok' | 'partial' | 'error';
}

/**
 * Options for TCP ping operation.
 */
export interface TcpPingOptions {
  /** Custom name for the diagnostic step (default: 'TCP Connect') */
  readonly name?: string;
  /** Connection timeout in milliseconds (default: 3000) */
  readonly timeoutMs?: number;
}

/**
 * Options for TLS handshake operation.
 */
export interface TlsHandshakeOptions {
  /** Handshake timeout in milliseconds (default: 5000) */
  readonly timeoutMs?: number;
  /** Whether to reject unauthorized certificates (default: true) */
  readonly rejectUnauthorized?: boolean;
}
