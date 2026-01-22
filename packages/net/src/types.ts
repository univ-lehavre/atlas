/* eslint-disable functional/no-conditional-statements -- Validation functions require conditionals */
/**
 * @module types
 * @description Type definitions and branded types for network diagnostic functions.
 */

import { Brand } from 'effect';

// ============================================================================
// Branded Types
// ============================================================================

/** Branded type for timeout values in milliseconds. */
export type TimeoutMs = number & Brand.Brand<'TimeoutMs'>;

/** Branded type for port numbers. */
export type Port = number & Brand.Brand<'Port'>;

/** Branded type for IP addresses. */
export type IpAddress = string & Brand.Brand<'IpAddress'>;

/** Branded type for hostnames. */
export type Hostname = string & Brand.Brand<'Hostname'>;

/** Union type for host parameter (hostname or IP address). */
export type Host = Hostname | IpAddress;

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
  readonly timeoutMs?: TimeoutMs;
}

/**
 * Options for TLS handshake operation.
 */
export interface TlsHandshakeOptions {
  /** Handshake timeout in milliseconds (default: 5000) */
  readonly timeoutMs?: TimeoutMs;
  /** Whether to reject unauthorized certificates (default: true) */
  readonly rejectUnauthorized?: boolean;
}

// ============================================================================
// Validation Constants
// ============================================================================

/** Minimum timeout value in milliseconds. */
const MIN_TIMEOUT_MS = 0;

/** Maximum timeout value in milliseconds (10 minutes). */
const MAX_TIMEOUT_MS = 600_000;

/** Minimum valid port number. */
const MIN_PORT = 1;

/** Maximum valid port number. */
const MAX_PORT = 65_535;

// ============================================================================
// Validators
// ============================================================================

/**
 * Validates an IPv4 address.
 * @param s - The string to validate
 * @returns True if the string is a valid IPv4 address
 */
const isValidIpv4 = (s: string): boolean => {
  const parts = s.split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => {
      const num = Number(part);
      return /^\d{1,3}$/.test(part) && num >= 0 && num <= 255;
    })
  );
};

/**
 * Validates an IPv6 address (simplified validation).
 * @param s - The string to validate
 * @returns True if the string is a valid IPv6 address
 */
const isValidIpv6 = (s: string): boolean => {
  if (s === '::' || s === '::1') return true;
  const parts = s.split(':');
  return parts.length === 8 && parts.every((part) => /^[a-f0-9]{1,4}$/i.test(part));
};

/**
 * Validates a hostname according to RFC 1123.
 * @param s - The string to validate
 * @returns True if the string is a valid hostname
 */
const isValidHostname = (s: string): boolean => {
  if (s.length === 0 || s.length > 253) return false;
  // Allow IP addresses as hostnames
  if (isValidIpv4(s) || isValidIpv6(s)) return true;
  // RFC 1123 hostname validation: labels separated by dots
  const labels = s.split('.');
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/i.test(label)
  );
};

// ============================================================================
// Brand Constructors
// ============================================================================

/**
 * Constructor for TimeoutMs branded type with validation.
 * @throws Brand error if timeout is not a positive integer within valid range
 */
export const TimeoutMs = Brand.refined<TimeoutMs>(
  (n) => Number.isInteger(n) && n >= MIN_TIMEOUT_MS && n <= MAX_TIMEOUT_MS,
  (n) =>
    Brand.error(
      `Invalid timeout: ${String(n)}ms. Must be an integer between ${String(MIN_TIMEOUT_MS)} and ${String(MAX_TIMEOUT_MS)}`
    )
);

/**
 * Constructor for Port branded type with validation.
 * @throws Brand error if port is not a valid port number (1-65535)
 */
export const Port = Brand.refined<Port>(
  (n) => Number.isInteger(n) && n >= MIN_PORT && n <= MAX_PORT,
  (n) =>
    Brand.error(
      `Invalid port: ${String(n)}. Must be an integer between ${String(MIN_PORT)} and ${String(MAX_PORT)}`
    )
);

/**
 * Constructor for IpAddress branded type with validation.
 * @throws Brand error if string is not a valid IPv4 or IPv6 address
 */
export const IpAddress = Brand.refined<IpAddress>(
  (s) => isValidIpv4(s) || isValidIpv6(s),
  (s) => Brand.error(`Invalid IP address: "${s}". Must be a valid IPv4 or IPv6 address`)
);

/**
 * Constructor for Hostname branded type with validation.
 * @throws Brand error if string is not a valid hostname (RFC 1123)
 */
export const Hostname = Brand.refined<Hostname>(
  (s) => isValidHostname(s),
  (s) => Brand.error(`Invalid hostname: "${s}". Must be a valid hostname (RFC 1123)`)
);
/* eslint-enable functional/no-conditional-statements */
