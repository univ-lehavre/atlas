import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSessionClient: vi.fn(),
}));

vi.mock('$lib/server/baas', () => ({
  createSessionClient: mocks.createSessionClient,
}));

const buildEvent = (url: string) => ({
  cookies: { get: vi.fn() },
  locals: {},
  url: new URL(url),
});

describe('find-an-expert hooks.server.ts handle', () => {
  beforeEach(() => {
    mocks.createSessionClient.mockReset();
    mocks.createSessionClient.mockReturnValue({
      account: { get: vi.fn().mockRejectedValue(new Error('no session')) },
    });
  });

  it('sets the static security headers on every response', async () => {
    const mod = await import('./hooks.server');
    const result = await mod.handle({
      event: buildEvent('https://example.com/'),
      resolve: async () => new Response('ok'),
    } as never);

    expect(result.headers.get('x-content-type-options')).toBe('nosniff');
    expect(result.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(result.headers.get('permissions-policy')).toContain('camera=()');
    expect(result.headers.get('x-frame-options')).toBe('DENY');
  });

  it('sets Strict-Transport-Security only when the request is HTTPS', async () => {
    const mod = await import('./hooks.server');

    const httpsResult = await mod.handle({
      event: buildEvent('https://example.com/'),
      resolve: async () => new Response('ok'),
    } as never);
    expect(httpsResult.headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );

    const httpResult = await mod.handle({
      event: buildEvent('http://localhost:5173/'),
      resolve: async () => new Response('ok'),
    } as never);
    expect(httpResult.headers.get('strict-transport-security')).toBeNull();
  });

  it('populates event.locals.userId and email when the session is valid', async () => {
    mocks.createSessionClient.mockReturnValueOnce({
      account: {
        get: vi.fn().mockResolvedValue({ $id: 'user-123', email: 'user@example.org' }),
      },
    });

    const event = buildEvent('https://example.com/');
    const mod = await import('./hooks.server');
    await mod.handle({
      event,
      resolve: async () => new Response('ok'),
    } as never);

    expect(event.locals).toMatchObject({
      userId: 'user-123',
      userEmail: 'user@example.org',
    });
  });
});
