import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppwriteException } from 'node-appwrite';

/**
 * Read `svelte.config.js` as raw text rather than importing it (see
 * apps/amarre/tests/hooks.server.test.ts for the rationale).
 * Vitest sets `process.cwd()` to the package root.
 */
const readSvelteConfig = (): string =>
  readFileSync(path.join(process.cwd(), 'svelte.config.js'), 'utf8');

// `vi.mock` is hoisted to the top of the module ; its factory can't
// close over outer scope. `vi.hoisted` lifts a helper alongside the
// mock so we can `accountGet.mockResolvedValueOnce` from inside the
// test body.
const mocks = vi.hoisted(() => {
  const accountGet = vi.fn();
  return {
    accountGet,
    createSessionClient: vi.fn(() => ({ account: { get: accountGet } })),
  };
});

vi.mock('$lib/server/baas', () => ({
  createSessionClient: mocks.createSessionClient,
}));

import { handle } from '../../src/hooks.server';

const makeEvent = (url = 'https://example.com/') =>
  ({
    cookies: {} as never,
    locals: {} as { userId?: string },
    url: new URL(url),
  }) as unknown as Parameters<typeof handle>[0]['event'];

const resolve: Parameters<typeof handle>[0]['resolve'] = async () =>
  new Response('ok', { status: 200 });

describe('hooks.server.handle', () => {
  beforeEach(() => {
    mocks.accountGet.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('populates locals.userId when the session is valid', async () => {
    mocks.accountGet.mockResolvedValueOnce({ $id: 'user-from-session' });
    const event = makeEvent();
    const res = await handle({ event, resolve });
    expect(res.status).toBe(200);
    expect((event.locals as { userId?: string }).userId).toBe('user-from-session');
  });

  it('leaves locals.userId undefined on Appwrite 401 (anonymous user)', async () => {
    const err = new AppwriteException('unauthenticated', 401, 'general_unauthorized', '');
    mocks.accountGet.mockRejectedValueOnce(err);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = makeEvent();
    const res = await handle({ event, resolve });
    expect(res.status).toBe(200);
    expect((event.locals as { userId?: string }).userId).toBeUndefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs and recovers on an unexpected Appwrite error (e.g. 500)', async () => {
    const err = new AppwriteException('server', 500, 'server_error', '');
    mocks.accountGet.mockRejectedValueOnce(err);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = makeEvent();
    const res = await handle({ event, resolve });
    expect(res.status).toBe(200);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('applies the shared static security headers on every response (Phase 9.2)', async () => {
    mocks.accountGet.mockRejectedValueOnce(new Error('no session'));
    const res = await handle({ event: makeEvent('https://app.example.org/'), resolve });
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('permissions-policy')).toContain('camera=()');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );
  });

  it('omits Strict-Transport-Security on plain http:// (dev traffic)', async () => {
    mocks.accountGet.mockRejectedValueOnce(new Error('no session'));
    const res = await handle({
      event: makeEvent('http://localhost:5173/'),
      resolve,
    });
    expect(res.headers.get('strict-transport-security')).toBeNull();
  });

  it('wires the shared CSP helper in svelte.config.js (Phase 9.2)', () => {
    const source = readSvelteConfig();
    expect(source).toContain("from '@univ-lehavre/atlas-sveltekit-csp'");
    expect(source).toContain('defaultCspDirectives()');
    expect(source).toContain('csp:');
    expect(source).toContain('directives: defaultCspDirectives()');
  });
});
