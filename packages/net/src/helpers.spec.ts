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
    it('returns CN when cert expires in more than 30 days', () => {
      const future = new Date();
      future.setDate(future.getDate() + 60);
      const cert = {
        valid_to: future.toUTCString(),
        subject: { CN: 'example.com' },
      } as Parameters<typeof formatCertificateMessage>[0];
      expect(formatCertificateMessage(cert)).toBe('example.com');
    });

    it('appends expiry warning when fewer than 30 days remain', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 5);
      const cert = {
        valid_to: soon.toUTCString(),
        subject: { CN: 'example.com' },
      } as Parameters<typeof formatCertificateMessage>[0];
      const result = formatCertificateMessage(cert);
      expect(result).toContain('example.com');
      expect(result).toMatch(/expires in \d+ days/);
    });

    it('returns "Certificate valid" when subject has no CN', () => {
      const future = new Date();
      future.setDate(future.getDate() + 60);
      const cert = {
        valid_to: future.toUTCString(),
        subject: null,
      } as unknown as Parameters<typeof formatCertificateMessage>[0];
      expect(formatCertificateMessage(cert)).toBe('Certificate valid');
    });

    it('returns CN without expiry warning when valid_to is empty', () => {
      const cert = {
        valid_to: '',
        subject: { CN: 'example.com' },
      } as Parameters<typeof formatCertificateMessage>[0];
      expect(formatCertificateMessage(cert)).toBe('example.com');
    });
  });
});
