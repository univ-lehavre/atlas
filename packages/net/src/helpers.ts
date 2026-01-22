/* eslint-disable functional/no-let, functional/no-conditional-statements, functional/no-expression-statements, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, unicorn/no-negated-condition -- Helper functions for network diagnostics */
/**
 * @module helpers
 * @description Internal helper functions for network diagnostics.
 */

import type * as tls from 'node:tls';

/** Mapping of TLS error codes to human-readable messages. */
const TLS_ERROR_MESSAGES: Record<string, string> = {
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Certificate not trusted (self-signed?)',
  CERT_HAS_EXPIRED: 'Certificate has expired',
  ERR_TLS_CERT_ALTNAME_INVALID: 'Certificate hostname mismatch',
};

/**
 * Formats a TLS error into a human-readable message.
 *
 * @param err - The Node.js error from TLS operations
 * @returns A user-friendly error message
 */
export const formatTlsErrorMessage = (err: NodeJS.ErrnoException): string =>
  (err.code && TLS_ERROR_MESSAGES[err.code]) ?? err.message;

/**
 * Extracts and formats certificate information into a message.
 *
 * @param cert - The peer certificate from a TLS connection
 * @returns A formatted message with CN and expiration warning if applicable
 */
export const formatCertificateMessage = (cert: tls.PeerCertificate): string => {
  const validTo = cert.valid_to !== '' ? new Date(cert.valid_to) : null;
  const daysLeft = validTo
    ? Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const cn = cert.subject ? cert.subject.CN : null;
  let message = cn ?? 'Certificate valid';
  if (daysLeft !== null && daysLeft < 30) {
    message += ` (expires in ${String(daysLeft)} days)`;
  }
  return message;
};
/* eslint-enable functional/no-let, functional/no-conditional-statements, functional/no-expression-statements, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, unicorn/no-negated-condition */
