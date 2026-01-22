/**
 * @fileoverview Tests for helper functions.
 */

import { describe, expect, it } from 'vitest';

import { formatCertificateMessage, formatTlsErrorMessage } from './helpers.js';

describe('helpers', () => {
  describe('formatTlsErrorMessage', () => {
    it('should format UNABLE_TO_VERIFY_LEAF_SIGNATURE error', () => {
      const err = {
        code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        message: 'original',
      } as NodeJS.ErrnoException;
      expect(formatTlsErrorMessage(err)).toBe('Certificate not trusted (self-signed?)');
    });

    it('should format CERT_HAS_EXPIRED error', () => {
      const err = { code: 'CERT_HAS_EXPIRED', message: 'original' } as NodeJS.ErrnoException;
      expect(formatTlsErrorMessage(err)).toBe('Certificate has expired');
    });

    it('should format ERR_TLS_CERT_ALTNAME_INVALID error', () => {
      const err = {
        code: 'ERR_TLS_CERT_ALTNAME_INVALID',
        message: 'original',
      } as NodeJS.ErrnoException;
      expect(formatTlsErrorMessage(err)).toBe('Certificate hostname mismatch');
    });

    it('should fallback to original message for unknown codes', () => {
      const err = { code: 'UNKNOWN_CODE', message: 'original message' } as NodeJS.ErrnoException;
      expect(formatTlsErrorMessage(err)).toBe('original message');
    });

    it('should fallback to original message when no code', () => {
      const err = { message: 'error without code' } as NodeJS.ErrnoException;
      expect(formatTlsErrorMessage(err)).toBe('error without code');
    });
  });

  describe('formatCertificateMessage', () => {
    it('should be a function', () => {
      expect(typeof formatCertificateMessage).toBe('function');
    });
  });
});
