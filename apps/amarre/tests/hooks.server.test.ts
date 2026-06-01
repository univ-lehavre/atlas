import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Read `svelte.config.js` as raw text rather than importing it.
 * Importing the config would drag it into the strict `tsc` graph and
 * expose a wider-vs-narrow CSP type mismatch (SvelteKit's `Csp.Source`
 * union is not exported, so our helper's `string[]` element type can't
 * be tightened to satisfy the assignability check). Vitest sets
 * `process.cwd()` to the package root.
 */
const readSvelteConfig = (): string =>
  readFileSync(path.join(process.cwd(), 'svelte.config.js'), 'utf8');

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

describe('amarre hooks.server.ts handle', () => {
  beforeEach(() => {
    mocks.createSessionClient.mockReset();
    mocks.createSessionClient.mockReturnValue({
      account: { get: vi.fn().mockRejectedValue(new Error('no session')) },
    });
  });

  it('sets the static security headers on every response', async () => {
    const mod = await import('../src/hooks.server');
    const result = await mod.session({
      event: buildEvent('https://example.com/'),
      resolve: async () => new Response('ok'),
    } as never);

    expect(result.headers.get('x-content-type-options')).toBe('nosniff');
    expect(result.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(result.headers.get('permissions-policy')).toContain('camera=()');
    expect(result.headers.get('permissions-policy')).toContain('microphone=()');
    expect(result.headers.get('x-frame-options')).toBe('DENY');
  });

  it('sets Strict-Transport-Security only when the request is HTTPS', async () => {
    const mod = await import('../src/hooks.server');

    const httpsResult = await mod.session({
      event: buildEvent('https://example.com/'),
      resolve: async () => new Response('ok'),
    } as never);
    expect(httpsResult.headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );

    const httpResult = await mod.session({
      event: buildEvent('http://localhost:5173/'),
      resolve: async () => new Response('ok'),
    } as never);
    expect(httpResult.headers.get('strict-transport-security')).toBeNull();
  });

  it('wires the shared CSP helper in svelte.config.js (Phase 9.2)', () => {
    // The handler does not emit the CSP header itself (SvelteKit injects
    // it at compile time from `kit.csp.directives`). Asserting on the
    // config source is the next-best check that we still ship the shared
    // baseline and catches an accidental override of the helper.
    const source = readSvelteConfig();
    expect(source).toContain("from '@univ-lehavre/atlas-sveltekit-csp'");
    expect(source).toContain('defaultCspDirectives()');
    expect(source).toContain('csp:');
    expect(source).toContain('directives: defaultCspDirectives()');
  });

  it('populates event.locals.userId when the session is valid', async () => {
    mocks.createSessionClient.mockReturnValueOnce({
      account: { get: vi.fn().mockResolvedValue({ $id: 'user-123' }) },
    });

    const event = buildEvent('https://example.com/');
    const mod = await import('../src/hooks.server');
    await mod.session({
      event,
      resolve: async () => new Response('ok'),
    } as never);

    expect(event.locals).toMatchObject({ userId: 'user-123' });
  });
});
