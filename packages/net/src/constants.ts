/**
 * @module constants
 * @description Network diagnostic constants.
 */

import { IpAddress, Port, TimeoutMs } from './brands.js';

// ============================================================================
// Timeouts
// ============================================================================

/** Default timeout for TCP connections in milliseconds. */
export const DEFAULT_TCP_TIMEOUT_MS = TimeoutMs(3000);

/** Default timeout for TLS handshakes in milliseconds. */
export const DEFAULT_TLS_TIMEOUT_MS = TimeoutMs(5000);

/** Default timeout for internet connectivity checks in milliseconds. */
export const DEFAULT_INTERNET_CHECK_TIMEOUT_MS = TimeoutMs(5000);

// ============================================================================
// Network
// ============================================================================

/** Host used for internet connectivity checks (Cloudflare DNS). */
export const INTERNET_CHECK_HOST = IpAddress('1.1.1.1');

/** Standard HTTPS port. */
export const HTTPS_PORT = Port(443);
