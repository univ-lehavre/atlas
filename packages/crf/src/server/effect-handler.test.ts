import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { Hono } from 'hono';
import { runEffect, runEffectRaw } from './effect-handler.js';
import { RedcapHttpError, RedcapApiError, RedcapNetworkError } from '../redcap/errors.js';
import { VersionParseError, UnsupportedVersionError } from '../redcap/version.js';

/**
 * Tests for Effect-to-Hono response handler
 */

describe('Effect Handler', () => {
  describe('runEffect', () => {
    it('should return success response with data wrapper', async () => {
      const app = new Hono();

      app.get('/test', (c) => runEffect(c, Effect.succeed({ message: 'Hello' })));

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ data: { message: 'Hello' } });
    });

    it('should return array data correctly', async () => {
      const app = new Hono();

      app.get('/test', (c) => runEffect(c, Effect.succeed([1, 2, 3])));

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ data: [1, 2, 3] });
    });

    it('should handle RedcapHttpError', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffect(c, Effect.fail(new RedcapHttpError({ status: 401, message: 'Unauthorized' })))
      );

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.data).toBeNull();
      expect(body.error.code).toBe('redcap_http_error');
      expect(body.error.message).toBe('Unauthorized');
    });

    it('should handle RedcapHttpError with 404', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffect(c, Effect.fail(new RedcapHttpError({ status: 404, message: 'Not Found' })))
      );

      const res = await app.request('/test');

      expect(res.status).toBe(404);
    });

    it('should handle RedcapHttpError with 500', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffect(c, Effect.fail(new RedcapHttpError({ status: 500, message: 'Server Error' })))
      );

      const res = await app.request('/test');

      expect(res.status).toBe(500);
    });

    it('should handle RedcapApiError without status', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffect(c, Effect.fail(new RedcapApiError({ message: 'Invalid token' })))
      );

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.data).toBeNull();
      expect(body.error.code).toBe('redcap_api_error');
      expect(body.error.message).toBe('Invalid token');
    });

    it('should handle RedcapApiError with custom status', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffect(c, Effect.fail(new RedcapApiError({ message: 'User not found', status: 404 })))
      );

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe('redcap_api_error');
    });

    it('should handle RedcapNetworkError', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffect(c, Effect.fail(new RedcapNetworkError({ cause: 'ECONNREFUSED' })))
      );

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.data).toBeNull();
      expect(body.error.code).toBe('network_error');
      expect(body.error.message).toBe('Failed to connect to REDCap');
    });

    it('should handle VersionParseError', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffect(c, Effect.fail(new VersionParseError({ versionString: 'invalid' })))
      );

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(502);
      expect(body.data).toBeNull();
      expect(body.error.code).toBe('version_parse_error');
    });

    it('should handle UnsupportedVersionError', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffect(
          c,
          Effect.fail(new UnsupportedVersionError({ version: { major: 13, minor: 0, patch: 0 } }))
        )
      );

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(501);
      expect(body.data).toBeNull();
      expect(body.error.code).toBe('unsupported_version');
    });
  });

  describe('runEffectRaw', () => {
    it('should return raw Response directly', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffectRaw(
          c,
          Effect.succeed(
            new Response('Hello World', {
              headers: { 'Content-Type': 'text/plain' },
            })
          )
        )
      );

      const res = await app.request('/test');

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('Hello World');
      expect(res.headers.get('Content-Type')).toBe('text/plain');
    });

    it('should handle binary data (PDF)', async () => {
      const app = new Hono();
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header

      app.get('/test', (c) =>
        runEffectRaw(
          c,
          Effect.succeed(
            new Response(pdfContent, {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="test.pdf"',
              },
            })
          )
        )
      );

      const res = await app.request('/test');

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('should handle errors like runEffect', async () => {
      const app = new Hono();

      app.get('/test', (c) =>
        runEffectRaw(c, Effect.fail(new RedcapNetworkError({ cause: 'timeout' })))
      );

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error.code).toBe('network_error');
    });
  });

  describe('Status Code Mapping', () => {
    it('should map status codes in valid range', async () => {
      const app = new Hono();

      // Test 400 range
      app.get('/400', (c) =>
        runEffect(c, Effect.fail(new RedcapHttpError({ status: 400, message: 'Bad Request' })))
      );

      // Test 500 range
      app.get('/500', (c) =>
        runEffect(c, Effect.fail(new RedcapHttpError({ status: 502, message: 'Bad Gateway' })))
      );

      const res400 = await app.request('/400');
      expect(res400.status).toBe(400);

      const res500 = await app.request('/500');
      expect(res500.status).toBe(502);
    });

    it('should default to 502 for invalid status codes', async () => {
      const app = new Hono();

      // Status outside 400-599 range should map to 502
      app.get('/test', (c) =>
        runEffect(c, Effect.fail(new RedcapHttpError({ status: 200, message: 'Unexpected' })))
      );

      const res = await app.request('/test');
      expect(res.status).toBe(502);
    });
  });
});
