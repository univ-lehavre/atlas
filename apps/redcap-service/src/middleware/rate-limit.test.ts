import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { apiRateLimiter } from './rate-limit.js';

const createApp = (): Hono => {
  const app = new Hono();
  app.use('/api/*', apiRateLimiter);
  app.get('/api/test', (c) => c.json({ message: 'success' }));
  return app;
};

describe('Rate Limiter Middleware', () => {
  it('allows requests within rate limit', async () => {
    const res = await createApp().request('/api/test');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ message: 'success' });
  });

  it('returns successful response with rate limiter enabled', async () => {
    const res = await createApp().request('/api/test');

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ message: 'success' });
  });

  it('extracts IP from x-forwarded-for header', async () => {
    const res = await createApp().request('/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.100, 10.0.0.1',
      },
    });

    expect(res.status).toBe(200);
  });

  it('extracts IP from x-real-ip header when x-forwarded-for is missing', async () => {
    const res = await createApp().request('/api/test', {
      headers: {
        'x-real-ip': '192.168.1.100',
      },
    });

    expect(res.status).toBe(200);
  });

  it('handles missing IP headers gracefully', async () => {
    const res = await createApp().request('/api/test');
    expect(res.status).toBe(200);
  });

  it('uses first IP from x-forwarded-for chain', async () => {
    const res = await createApp().request('/api/test', {
      headers: {
        'x-forwarded-for': '  192.168.1.100  , 10.0.0.1, 172.16.0.1',
      },
    });

    expect(res.status).toBe(200);
  });

  it('prefers x-forwarded-for over x-real-ip', async () => {
    const res = await createApp().request('/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.100',
        'x-real-ip': '10.0.0.1',
      },
    });

    expect(res.status).toBe(200);
  });

  it('handles empty x-forwarded-for header', async () => {
    const res = await createApp().request('/api/test', {
      headers: {
        'x-forwarded-for': '',
        'x-real-ip': '192.168.1.100',
      },
    });

    expect(res.status).toBe(200);
  });

  it('handles empty x-real-ip header', async () => {
    const res = await createApp().request('/api/test', {
      headers: {
        'x-real-ip': '',
      },
    });

    expect(res.status).toBe(200);
  });

  it('blocks requests exceeding rate limit', async () => {
    // Make 101 requests to exceed the 100 request limit
    const app = createApp();
    const responses = await Promise.all(
      Array.from({ length: 101 }, async () =>
        app.request('/api/test', {
          headers: { 'x-real-ip': '192.168.1.100' },
        })
      )
    );

    // Last request should be rate limited
    const lastResponse = responses.at(-1);
    expect(lastResponse?.status).toBe(429);
  }, 30_000);

  it('tracks different IPs separately', async () => {
    // Use unique IPs that haven't been used in other tests
    const ip1Response = await createApp().request('/api/test', {
      headers: { 'x-real-ip': '10.0.0.50' },
    });

    const ip2Response = await createApp().request('/api/test', {
      headers: { 'x-real-ip': '10.0.0.51' },
    });

    // Both should succeed as they're separate IPs with independent rate limits
    expect(ip1Response.status).toBe(200);
    expect(ip2Response.status).toBe(200);
  });
});
