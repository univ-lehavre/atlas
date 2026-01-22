/**
 * @fileoverview Tests for the public API.
 */

import { describe, expect, it } from 'vitest';

import {
  // Diagnostic Types
  type DiagnosticStatus,
  type DiagnosticStep,
  type DiagnosticResult,
  type TcpPingOptions,
  type TlsHandshakeOptions,
  // Branded Types
  IpAddress,
  Port,
  TimeoutMs,
  // Constants
  DEFAULT_TCP_TIMEOUT_MS,
  DEFAULT_TLS_TIMEOUT_MS,
  DEFAULT_INTERNET_CHECK_TIMEOUT_MS,
  INTERNET_CHECK_HOST,
  HTTPS_PORT,
  // Functions
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
} from './index.js';

// Direct imports for comparison
import {
  IpAddress as BrandsIpAddress,
  Port as BrandsPort,
  TimeoutMs as BrandsTimeoutMs,
} from './brands.js';
import {
  DEFAULT_TCP_TIMEOUT_MS as ConstantsTcpTimeout,
  DEFAULT_TLS_TIMEOUT_MS as ConstantsTlsTimeout,
  DEFAULT_INTERNET_CHECK_TIMEOUT_MS as ConstantsInternetTimeout,
  INTERNET_CHECK_HOST as ConstantsInternetHost,
  HTTPS_PORT as ConstantsHttpsPort,
} from './constants.js';
import {
  dnsResolve as DiagDnsResolve,
  tcpPing as DiagTcpPing,
  tlsHandshake as DiagTlsHandshake,
  checkInternet as DiagCheckInternet,
} from './diagnostics.js';

describe('index (public API)', () => {
  describe('Functions', () => {
    it('should export dnsResolve function', () => {
      expect(typeof dnsResolve).toBe('function');
    });

    it('should export tcpPing function', () => {
      expect(typeof tcpPing).toBe('function');
    });

    it('should export tlsHandshake function', () => {
      expect(typeof tlsHandshake).toBe('function');
    });

    it('should export checkInternet function', () => {
      expect(typeof checkInternet).toBe('function');
    });

    it('should export same functions as diagnostics.ts', () => {
      expect(dnsResolve).toBe(DiagDnsResolve);
      expect(tcpPing).toBe(DiagTcpPing);
      expect(tlsHandshake).toBe(DiagTlsHandshake);
      expect(checkInternet).toBe(DiagCheckInternet);
    });
  });

  describe('Diagnostic Types', () => {
    it('should export type DiagnosticStatus', () => {
      const status: DiagnosticStatus = 'ok';
      expect(['ok', 'error', 'skipped']).toContain(status);
    });

    it('should export type DiagnosticStep', () => {
      const step: DiagnosticStep = {
        name: 'test',
        status: 'ok',
        latencyMs: 10,
        message: 'test message',
      };
      expect(step.name).toBe('test');
    });

    it('should export type DiagnosticResult', () => {
      const result: DiagnosticResult = {
        steps: [],
        overallStatus: 'ok',
      };
      expect(result.overallStatus).toBe('ok');
    });

    it('should export type TcpPingOptions', () => {
      const options: TcpPingOptions = {
        name: 'test',
        timeoutMs: 1000,
      };
      expect(options.name).toBe('test');
    });

    it('should export type TlsHandshakeOptions', () => {
      const options: TlsHandshakeOptions = {
        timeoutMs: 1000,
        rejectUnauthorized: true,
      };
      expect(options.timeoutMs).toBe(1000);
    });
  });

  describe('Branded Types', () => {
    it('should export TimeoutMs brand constructor', () => {
      expect(typeof TimeoutMs).toBe('function');
    });

    it('should export Port brand constructor', () => {
      expect(typeof Port).toBe('function');
    });

    it('should export IpAddress brand constructor', () => {
      expect(typeof IpAddress).toBe('function');
    });

    it('should export same branded types as brands.ts', () => {
      expect(TimeoutMs).toBe(BrandsTimeoutMs);
      expect(Port).toBe(BrandsPort);
      expect(IpAddress).toBe(BrandsIpAddress);
    });
  });

  describe('Constants', () => {
    it('should export DEFAULT_TCP_TIMEOUT_MS', () => {
      expect(DEFAULT_TCP_TIMEOUT_MS).toBe(3000);
    });

    it('should export DEFAULT_TLS_TIMEOUT_MS', () => {
      expect(DEFAULT_TLS_TIMEOUT_MS).toBe(5000);
    });

    it('should export DEFAULT_INTERNET_CHECK_TIMEOUT_MS', () => {
      expect(DEFAULT_INTERNET_CHECK_TIMEOUT_MS).toBe(5000);
    });

    it('should export INTERNET_CHECK_HOST', () => {
      expect(INTERNET_CHECK_HOST).toBe('1.1.1.1');
    });

    it('should export HTTPS_PORT', () => {
      expect(HTTPS_PORT).toBe(443);
    });

    it('should export same constants as constants.ts', () => {
      expect(DEFAULT_TCP_TIMEOUT_MS).toBe(ConstantsTcpTimeout);
      expect(DEFAULT_TLS_TIMEOUT_MS).toBe(ConstantsTlsTimeout);
      expect(DEFAULT_INTERNET_CHECK_TIMEOUT_MS).toBe(ConstantsInternetTimeout);
      expect(INTERNET_CHECK_HOST).toBe(ConstantsInternetHost);
      expect(HTTPS_PORT).toBe(ConstantsHttpsPort);
    });
  });
});
