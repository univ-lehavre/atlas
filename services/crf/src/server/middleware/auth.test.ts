import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { bearerAuth } from './auth.js';

const SECRET = 'super-secret-token';

const makeApp = (): Hono => {
  const app = new Hono();
  app.use('/api/*', bearerAuth(SECRET));
  app.get('/api/ping', (c) => c.json({ ok: true }));
  app.get('/health', (c) => c.json({ status: 'ok' }));
  return app;
};

describe('bearerAuth middleware', () => {
  it('allows a request carrying the correct Bearer token', async () => {
    const res = await makeApp().request('/api/ping', {
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await makeApp().request('/api/ping');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('unauthorized');
  });

  it('returns the same generic 401 whether the header is absent or the token is wrong', async () => {
    // A single, generic message avoids leaking which check failed.
    const absent = await makeApp().request('/api/ping');
    const wrong = await makeApp().request('/api/ping', {
      headers: { Authorization: `Bearer ${'x'.repeat(SECRET.length)}` },
    });
    expect(absent.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await absent.json()).toEqual(await wrong.json());
  });

  it('rejects a malformed Authorization header (not a Bearer)', async () => {
    const res = await makeApp().request('/api/ping', {
      headers: { Authorization: SECRET },
    });
    expect(res.status).toBe(401);
  });

  it('rejects an empty Bearer token', async () => {
    const res = await makeApp().request('/api/ping', {
      headers: { Authorization: 'Bearer ' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects a wrong token of the same length', async () => {
    const wrong = 'x'.repeat(SECRET.length);
    const res = await makeApp().request('/api/ping', {
      headers: { Authorization: `Bearer ${wrong}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects a wrong token of a different length', async () => {
    const res = await makeApp().request('/api/ping', {
      headers: { Authorization: 'Bearer short' },
    });
    expect(res.status).toBe(401);
  });

  it('only guards the paths it is mounted on (here /api/*)', async () => {
    // The middleware is mounted on /api/* only; /health is not guarded.
    const res = await makeApp().request('/health');
    expect(res.status).toBe(200);
  });
});
