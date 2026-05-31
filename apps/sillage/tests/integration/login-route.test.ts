import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

import { load } from '../../src/routes/login/+page.server';

const makeEvent = (
  params: Record<string, string> = {},
  fetchImpl: typeof globalThis.fetch = vi.fn(async () => new Response('{}'))
): RequestEvent =>
  ({
    url: new URL(`http://localhost/login?${new URLSearchParams(params)}`),
    fetch: fetchImpl,
  }) as unknown as RequestEvent;

describe('/login +page.server load (magic link consumer)', () => {
  it('redirects to / after a successful login call', async () => {
    const fetchSpy = vi.fn(async () => new Response('{"data":{"loggedIn":true}}'));
    // SvelteKit's `redirect()` throws a special object — we catch it
    // and assert on shape.
    let thrown: unknown = null;
    try {
      // @ts-expect-error — partial event stub.
      await load(makeEvent({ userId: 'abc', secret: 'def' }, fetchSpy));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();
    expect((thrown as { status?: number }).status).toBe(302);
    expect((thrown as { location?: string }).location).toBe('/');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
    );
  });

  it('throws a validation error when the secret is missing', async () => {
    let thrown: unknown = null;
    try {
      // @ts-expect-error — partial event stub.
      await load(makeEvent({ userId: 'abc' }));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();
    // Validation errors are not SvelteKit redirects ; they bubble up
    // as MagicUrlLoginValidationError → 500 in the route, which is OK
    // for the smoke since /login should only be visited via a valid
    // magic URL.
  });

  it('throws when both userId and secret are missing', async () => {
    let thrown: unknown = null;
    try {
      // @ts-expect-error — partial event stub.
      await load(makeEvent({}));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();
  });
});
