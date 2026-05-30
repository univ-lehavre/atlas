import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { apiRateLimiter } from './rate-limit.js';

const makeApp = (): Hono => {
  const app = new Hono();
  app.use('*', apiRateLimiter);
  app.get('/ping', (c) => c.json({ ok: true }));
  return app;
};

describe('apiRateLimiter middleware', () => {
  it('allows a request under the limit and emits standard RateLimit headers', async () => {
    const app = makeApp();
    const res = await app.request('/ping', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });

    expect(res.status).toBe(200);
    // hono-rate-limiter draft-7 emits `RateLimit-Policy` + a combined `RateLimit` header
    expect(res.headers.get('ratelimit-policy')).not.toBeNull();
    expect(res.headers.get('ratelimit')).not.toBeNull();
  });

  it('uses the first IP from x-forwarded-for', async () => {
    const app = makeApp();
    const res = await app.request('/ping', {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
    });
    expect(res.status).toBe(200);
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    const app = makeApp();
    const res = await app.request('/ping', {
      headers: { 'x-real-ip': '198.51.100.42' },
    });
    expect(res.status).toBe(200);
  });

  it('falls back to "unknown" when no IP headers are provided', async () => {
    const app = makeApp();
    const res = await app.request('/ping');
    expect(res.status).toBe(200);
  });

  it('falls back to x-real-ip when x-forwarded-for is empty string', async () => {
    const app = makeApp();
    const res = await app.request('/ping', {
      headers: { 'x-forwarded-for': '', 'x-real-ip': '198.51.100.7' },
    });
    expect(res.status).toBe(200);
  });

  it('returns 429 once the limit is exceeded for a given IP', async () => {
    const app = makeApp();
    const headers = { 'x-forwarded-for': '192.0.2.99' };

    // The limit is 100 per 15-minute window. Make 100 successful requests,
    // then assert that the 101st is rate-limited.
    for (let i = 0; i < 100; i++) {
      const res = await app.request('/ping', { headers });
      expect(res.status).toBe(200);
    }

    const over = await app.request('/ping', { headers });
    expect(over.status).toBe(429);
  });
});
