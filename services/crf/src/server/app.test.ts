import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';

const clientMock = {
  getVersion: vi.fn(),
  getProjectInfo: vi.fn(),
  getInstruments: vi.fn(),
  getFields: vi.fn(),
  getExportFieldNames: vi.fn(),
  exportRecords: vi.fn(),
  importRecords: vi.fn(),
  getSurveyLink: vi.fn(),
  downloadPdf: vi.fn(),
  exportFile: vi.fn(),
  importFile: vi.fn(),
  findUserIdByEmail: vi.fn(),
};

vi.mock('./client.js', () => ({ client: clientMock }));

// Silence the error handler's console.error in onError tests.
vi.spyOn(console, 'error').mockImplementation(() => {
  /* noop */
});

import type * as AppModuleType from './app.js';

const DEFAULT_OPTIONS = { port: 3001, disableRateLimit: true } as const;

type AppModule = typeof AppModuleType;

const loadApp = async (options: { port: number; disableRateLimit?: boolean } = DEFAULT_OPTIONS) => {
  const { createApp } = (await import('./app.js')) as AppModule;
  return createApp(options);
};

describe('createApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wires /health route', async () => {
    const app = await loadApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('wires /api/v1/project/version through the project router', async () => {
    clientMock.getVersion.mockReturnValue(Effect.succeed('14.0.0'));
    const app = await loadApp();
    const res = await app.request('/api/v1/project/version');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { version: string } };
    expect(body.data).toEqual({ version: '14.0.0' });
  });

  it('returns 405 with Allow header for an unsupported method on a known route', async () => {
    const app = await loadApp();
    const res = await app.request('/api/v1/users/by-email', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET');
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('method_not_allowed');
  });

  it('returns 405 for TRACE on any path with full Allow list', async () => {
    const app = await loadApp();
    // The Fetch Request API rejects TRACE, so build a real GET Request and
    // override the `method` getter so the traceBlocker middleware sees TRACE.
    const req = new Request('http://localhost/health');
    Object.defineProperty(req, 'method', { value: 'TRACE', configurable: true });
    const res = await app.fetch(req);
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET, POST, PUT, DELETE, OPTIONS');
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('method_not_allowed');
    expect(body.error.message).toContain('TRACE');
  });

  it('returns 404 with code not_found for an unknown path', async () => {
    const app = await loadApp();
    const res = await app.request('/nowhere');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('not_found');
  });

  it('returns 500 via onError when a handler throws', async () => {
    const { createApp } = (await import('./app.js')) as AppModule;
    const app = createApp({ port: 3001, disableRateLimit: true });
    app.get('/boom', () => {
      throw new Error('kaboom');
    });
    const res = await app.request('/boom');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('internal_error');
    expect(body.error.message).toBe('kaboom');
  });

  it('falls back to a generic message when the thrown error has no message', async () => {
    const { createApp } = (await import('./app.js')) as AppModule;
    const app = createApp({ port: 3001, disableRateLimit: true });
    app.get('/empty', () => {
      // eslint-disable-next-line unicorn/error-message -- message vide volontaire pour exercer le fallback onError
      throw new Error('');
    });
    const res = await app.request('/empty');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('An unexpected error occurred');
  });

  it('serves the OpenAPI spec at /openapi.json', async () => {
    const app = await loadApp({ port: 3001, disableRateLimit: true });
    const res = await app.request('/openapi.json');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { info?: { title?: string }; openapi?: string };
    expect(body.info?.title).toBe('CRF Service API');
  });

  it('serves the docs page at /docs', async () => {
    const app = await loadApp();
    const res = await app.request('/docs');
    expect(res.status).toBe(200);
  });

  it('enables rate limiting by default (RateLimit-* headers present)', async () => {
    const app = await loadApp({ port: 3001 });
    clientMock.getVersion.mockReturnValue(Effect.succeed('14.0.0'));
    const res = await app.request('/api/v1/project/version', {
      headers: { 'x-forwarded-for': '203.0.113.55' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('ratelimit-policy')).not.toBeNull();
  });
});
