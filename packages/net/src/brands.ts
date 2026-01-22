/* eslint-disable functional/no-conditional-statements -- Validation functions require conditionals */
/**
 * @module brands
 * @description Branded types for type-safe network values.
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

// ============================================================================
// Constants
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

// ============================================================================
// Constructors
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
/* eslint-enable functional/no-conditional-statements */
