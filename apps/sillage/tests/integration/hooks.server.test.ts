import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppwriteException } from 'node-appwrite';

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

const makeEvent = () =>
  ({
    cookies: {} as never,
    locals: {} as { userId?: string },
    url: new URL('http://localhost/'),
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
});
