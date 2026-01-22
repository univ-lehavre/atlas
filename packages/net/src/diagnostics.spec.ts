/* eslint-disable security/detect-object-injection -- Test callbacks require imperative code and dynamic event handlers */
/**
 * @fileoverview Tests for diagnostic functions.
 */

import * as dns from 'node:dns';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkInternet, dnsResolve, tcpPing, tlsHandshake } from './diagnostics.js';

// Mock node modules
vi.mock('node:dns');
vi.mock('node:net');
vi.mock('node:tls');

// Helper to create mock TCP socket
const createMockSocket = (): {
  mockSocket: {
    setTimeout: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    removeAllListeners: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };
  getEventHandler: (event: string) => ((...args: unknown[]) => void) | undefined;
} => {
  const eventHandlers: Record<string, (...args: unknown[]) => void> = {};
  const mockSocket = {
    setTimeout: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers[event] = handler;
    }),
    connect: vi.fn(),
    removeAllListeners: vi.fn(),
    destroy: vi.fn(),
  };
  return {
    mockSocket,
    getEventHandler: (event: string) => eventHandlers[event],
  };
};

// Helper to create mock TLS socket
const createMockTlsSocket = (): {
  mockSocket: {
    on: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    getPeerCertificate: ReturnType<typeof vi.fn>;
  };
  getEventHandler: (event: string) => ((...args: unknown[]) => void) | undefined;
  connectCallback: { current: (() => void) | null };
  setupMock: () => void;
} => {
  const eventHandlers: Record<string, (...args: unknown[]) => void> = {};
  const connectCallback: { current: (() => void) | null } = { current: null };
  const mockSocket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers[event] = handler;
    }),
    destroy: vi.fn(),
    getPeerCertificate: vi.fn().mockReturnValue({
      subject: { CN: 'example.com' },
      valid_to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  };
  return {
    mockSocket,
    getEventHandler: (event: string) => eventHandlers[event],
    connectCallback,
    setupMock: () => {
      vi.mocked(tls.connect).mockImplementation((_options, callback) => {
        connectCallback.current = callback as () => void;
        return mockSocket as unknown as tls.TLSSocket;
      });
    },
  };
};

describe('diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('dnsResolve', () => {
    it('should return ok status when hostname resolves successfully', async () => {
      vi.mocked(dns.lookup).mockImplementation((_hostname, callback) => {
        (callback as (err: NodeJS.ErrnoException | null, address: string) => void)(
          null,
          '93.184.216.34'
        );
      });

      const result = await Effect.runPromise(dnsResolve('example.com'));

      expect(result.name).toBe('DNS Resolve');
      expect(result.status).toBe('ok');
      expect(result.message).toBe('93.184.216.34');
      expect(result.latencyMs).toBeDefined();
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should return error status with "Hostname not found" for ENOTFOUND', async () => {
      vi.mocked(dns.lookup).mockImplementation((_hostname, callback) => {
        const error = new Error('getaddrinfo ENOTFOUND') as NodeJS.ErrnoException;
        error.code = 'ENOTFOUND';
        (callback as (err: NodeJS.ErrnoException | null, address: string) => void)(error, '');
      });

      const result = await Effect.runPromise(dnsResolve('nonexistent.invalid'));

      expect(result.name).toBe('DNS Resolve');
      expect(result.status).toBe('error');
      expect(result.message).toBe('Hostname not found');
      expect(result.latencyMs).toBeDefined();
    });

    it('should return error status with original message for other errors', async () => {
      vi.mocked(dns.lookup).mockImplementation((_hostname, callback) => {
        const error = new Error('DNS server unreachable') as NodeJS.ErrnoException;
        error.code = 'EAI_AGAIN';
        (callback as (err: NodeJS.ErrnoException | null, address: string) => void)(error, '');
      });

      const result = await Effect.runPromise(dnsResolve('example.com'));

      expect(result.name).toBe('DNS Resolve');
      expect(result.status).toBe('error');
      expect(result.message).toBe('DNS server unreachable');
    });

    it('should measure latency correctly', async () => {
      vi.mocked(dns.lookup).mockImplementation((_hostname, callback) => {
        setTimeout(() => {
          (callback as (err: NodeJS.ErrnoException | null, address: string) => void)(
            null,
            '1.2.3.4'
          );
        }, 100);
      });

      const resultPromise = Effect.runPromise(dnsResolve('example.com'));
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result.latencyMs).toBeGreaterThanOrEqual(100);
    });
  });

  describe('tcpPing', () => {
    it('should return ok status when connection succeeds', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(tcpPing('example.com', 443));

      // Simulate successful connection
      getEventHandler('connect')?.();

      const result = await resultPromise;

      expect(result.name).toBe('TCP Connect');
      expect(result.status).toBe('ok');
      expect(result.latencyMs).toBeDefined();
      expect(mockSocket.connect).toHaveBeenCalledWith(443, 'example.com');
    });

    it('should return error status on timeout', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(tcpPing('slow.example.com', 443));

      // Simulate timeout
      getEventHandler('timeout')?.();

      const result = await resultPromise;

      expect(result.name).toBe('TCP Connect');
      expect(result.status).toBe('error');
      expect(result.message).toBe('Connection timeout');
    });

    it('should return error status on connection error', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(tcpPing('unreachable.example.com', 443));

      // Simulate connection error
      getEventHandler('error')?.(new Error('Connection refused'));

      const result = await resultPromise;

      expect(result.name).toBe('TCP Connect');
      expect(result.status).toBe('error');
      expect(result.message).toBe('Connection refused');
    });

    it('should use custom name when provided', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(tcpPing('example.com', 443, { name: 'Custom Ping' }));

      getEventHandler('connect')?.();

      const result = await resultPromise;

      expect(result.name).toBe('Custom Ping');
    });

    it('should use custom timeout when provided', () => {
      const { mockSocket } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      void Effect.runPromise(tcpPing('example.com', 443, { timeoutMs: 10_000 }));

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(10_000);
    });

    it('should use default timeout when not provided', () => {
      const { mockSocket } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      void Effect.runPromise(tcpPing('example.com', 443));

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(3000);
    });

    it('should cleanup socket on success', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(tcpPing('example.com', 443));

      getEventHandler('connect')?.();
      await resultPromise;

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should cleanup socket on error', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(tcpPing('example.com', 443));

      getEventHandler('error')?.(new Error('Failed'));
      await resultPromise;

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should cleanup socket on timeout', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(tcpPing('example.com', 443));

      getEventHandler('timeout')?.();
      await resultPromise;

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('tlsHandshake', () => {
    it('should return ok status when TLS handshake succeeds', async () => {
      const { connectCallback, setupMock } = createMockTlsSocket();
      setupMock();

      const resultPromise = Effect.runPromise(tlsHandshake('example.com', 443));

      // Simulate successful handshake
      connectCallback.current?.();

      const result = await resultPromise;

      expect(result.name).toBe('TLS Handshake');
      expect(result.status).toBe('ok');
      expect(result.latencyMs).toBeDefined();
      expect(result.message).toBe('example.com');
    });

    it('should return error status on timeout', async () => {
      const { getEventHandler, setupMock } = createMockTlsSocket();
      setupMock();

      const resultPromise = Effect.runPromise(tlsHandshake('slow.example.com', 443));

      // Simulate timeout
      getEventHandler('timeout')?.();

      const result = await resultPromise;

      expect(result.name).toBe('TLS Handshake');
      expect(result.status).toBe('error');
      expect(result.message).toBe('Connection timeout');
    });

    it('should return error status on connection error', async () => {
      const { getEventHandler, setupMock } = createMockTlsSocket();
      setupMock();

      const resultPromise = Effect.runPromise(tlsHandshake('bad-cert.example.com', 443));

      const error = new Error('Certificate expired') as NodeJS.ErrnoException;
      error.code = 'CERT_HAS_EXPIRED';
      getEventHandler('error')?.(error);

      const result = await resultPromise;

      expect(result.name).toBe('TLS Handshake');
      expect(result.status).toBe('error');
      expect(result.message).toBe('Certificate has expired');
    });

    it('should format self-signed certificate error', async () => {
      const { getEventHandler, setupMock } = createMockTlsSocket();
      setupMock();

      const resultPromise = Effect.runPromise(tlsHandshake('self-signed.example.com', 443));

      const error = new Error('Self signed') as NodeJS.ErrnoException;
      error.code = 'UNABLE_TO_VERIFY_LEAF_SIGNATURE';
      getEventHandler('error')?.(error);

      const result = await resultPromise;

      expect(result.message).toBe('Certificate not trusted (self-signed?)');
    });

    it('should format hostname mismatch error', async () => {
      const { getEventHandler, setupMock } = createMockTlsSocket();
      setupMock();

      const resultPromise = Effect.runPromise(tlsHandshake('wrong-host.example.com', 443));

      const error = new Error('Hostname mismatch') as NodeJS.ErrnoException;
      error.code = 'ERR_TLS_CERT_ALTNAME_INVALID';
      getEventHandler('error')?.(error);

      const result = await resultPromise;

      expect(result.message).toBe('Certificate hostname mismatch');
    });

    it('should use default options', () => {
      const { setupMock } = createMockTlsSocket();
      setupMock();

      void Effect.runPromise(tlsHandshake('example.com', 443));

      expect(tls.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'example.com',
          port: 443,
          rejectUnauthorized: true,
          timeout: 5000,
        }),
        expect.any(Function)
      );
    });

    it('should use custom timeout when provided', () => {
      const { setupMock } = createMockTlsSocket();
      setupMock();

      void Effect.runPromise(tlsHandshake('example.com', 443, { timeoutMs: 10_000 }));

      expect(tls.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10_000,
        }),
        expect.any(Function)
      );
    });

    it('should allow self-signed certificates when rejectUnauthorized is false', () => {
      const { setupMock } = createMockTlsSocket();
      setupMock();

      void Effect.runPromise(tlsHandshake('example.com', 443, { rejectUnauthorized: false }));

      expect(tls.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          rejectUnauthorized: false,
        }),
        expect.any(Function)
      );
    });

    it('should include certificate expiration warning when less than 30 days', async () => {
      const { mockSocket, connectCallback, setupMock } = createMockTlsSocket();
      mockSocket.getPeerCertificate.mockReturnValue({
        subject: { CN: 'example.com' },
        valid_to: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setupMock();

      const resultPromise = Effect.runPromise(tlsHandshake('example.com', 443));
      connectCallback.current?.();
      const result = await resultPromise;

      expect(result.message).toMatch(/expires in \d+ days/);
    });

    it('should cleanup socket on success', async () => {
      const { mockSocket, connectCallback, setupMock } = createMockTlsSocket();
      setupMock();

      const resultPromise = Effect.runPromise(tlsHandshake('example.com', 443));

      connectCallback.current?.();
      await resultPromise;

      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should cleanup socket on error', async () => {
      const { mockSocket, getEventHandler, setupMock } = createMockTlsSocket();
      setupMock();

      const resultPromise = Effect.runPromise(tlsHandshake('example.com', 443));

      getEventHandler('error')?.(new Error('Failed'));
      await resultPromise;

      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should cleanup socket on timeout', async () => {
      const { mockSocket, getEventHandler, setupMock } = createMockTlsSocket();
      setupMock();

      const resultPromise = Effect.runPromise(tlsHandshake('example.com', 443));

      getEventHandler('timeout')?.();
      await resultPromise;

      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('checkInternet', () => {
    it('should return ok status when internet is available', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(checkInternet());

      getEventHandler('connect')?.();

      const result = await resultPromise;

      expect(result.name).toBe('Internet Check');
      expect(result.status).toBe('ok');
    });

    it('should return error status when internet is unavailable', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(checkInternet());

      getEventHandler('timeout')?.();

      const result = await resultPromise;

      expect(result.name).toBe('Internet Check');
      expect(result.status).toBe('error');
      expect(result.message).toBe('Connection timeout');
    });

    it('should connect to Cloudflare DNS (1.1.1.1) on port 443', () => {
      const { mockSocket } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      void Effect.runPromise(checkInternet());

      expect(mockSocket.connect).toHaveBeenCalledWith(443, '1.1.1.1');
    });

    it('should use default timeout of 5000ms', () => {
      const { mockSocket } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      void Effect.runPromise(checkInternet());

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(5000);
    });

    it('should allow custom timeout', () => {
      const { mockSocket } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      void Effect.runPromise(checkInternet({ timeoutMs: 10_000 }));

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(10_000);
    });

    it('should allow custom name', async () => {
      const { mockSocket, getEventHandler } = createMockSocket();
      vi.mocked(net.Socket).mockImplementation(() => mockSocket as unknown as net.Socket);

      const resultPromise = Effect.runPromise(checkInternet({ name: 'Custom Internet Check' }));

      getEventHandler('connect')?.();

      const result = await resultPromise;

      expect(result.name).toBe('Custom Internet Check');
    });
  });
});
/* eslint-enable security/detect-object-injection */
