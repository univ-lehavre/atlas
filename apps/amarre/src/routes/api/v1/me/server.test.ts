import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/services/profile', () => ({
  getProfile: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('GET /api/v1/me — 200', () => {
  it('returns the user profile when authenticated', async () => {
    const profile = await import('$lib/server/services/profile');
    (profile.getProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'user_1',
      email: 'someone@univ-lehavre.fr',
      labels: [],
    });

    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'GET',
      url: 'https://example.com/api/v1/me',
      locals: { userId: 'user_1' },
    });
    const res = await mod.GET(event as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ id: 'user_1', email: 'someone@univ-lehavre.fr' });
  });
});

describe('GET /api/v1/me — 401', () => {
  it('returns 401 when the request is unauthenticated', async () => {
    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'GET',
      url: 'https://example.com/api/v1/me',
      locals: {},
    });
    const res = await mod.GET(event as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({
      data: null,
      error: { code: 'unauthenticated' },
    });
  });
});

describe('GET /api/v1/me — payload malformé', () => {
  it('returns 401 when locals.userId is malformed (not a string)', async () => {
    // Payload malformé : la session contient un userId du mauvais type
    // (par ex. injecté par un hook bogué). Le handler doit refuser au
    // lieu d'appeler le service avec une valeur invalide.
    const profile = await import('$lib/server/services/profile');
    const getProfile = profile.getProfile as ReturnType<typeof vi.fn>;

    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'GET',
      url: 'https://example.com/api/v1/me',
      locals: { userId: 12_345 as unknown as string },
    });
    const res = await mod.GET(event as never);

    expect(res.status).toBe(401);
    expect(getProfile).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body).toMatchObject({
      data: null,
      error: { code: 'unauthenticated' },
    });
  });
});
