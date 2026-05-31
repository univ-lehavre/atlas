import { describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';

// Mock createAuthService so importing the service module doesn't try
// to talk to Appwrite. The mock exposes the three methods the wrapper
// delegates to, with vi.fn() that we can assert on.
const fakeService = vi.hoisted(() => ({
  signupWithEmail: vi.fn(async () => ({ $id: 'token-mock' })),
  login: vi.fn(async () => ({ $id: 'session-mock' })),
  logout: vi.fn(async () => {}),
}));

vi.mock('@univ-lehavre/atlas-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@univ-lehavre/atlas-auth')>();
  return {
    ...actual,
    createAuthService: vi.fn(() => fakeService),
  };
});

import { login, logout, signupWithEmail } from '../../src/lib/server/services/auth';

const makeCookies = (): Cookies =>
  ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
    serialize: vi.fn(),
  }) as unknown as Cookies;

describe('lib/server/services/auth', () => {
  it('signupWithEmail delegates to the shared service', async () => {
    const out = await signupWithEmail('user@example.org');
    expect(fakeService.signupWithEmail).toHaveBeenCalledWith('user@example.org');
    expect(out.$id).toBe('token-mock');
  });

  it('login delegates with cookies', async () => {
    const cookies = makeCookies();
    const out = await login('abc', 'def', cookies);
    expect(fakeService.login).toHaveBeenCalledWith('abc', 'def', cookies);
    expect(out.$id).toBe('session-mock');
  });

  it('logout delegates with cookies', async () => {
    const cookies = makeCookies();
    await logout('abc', cookies);
    expect(fakeService.logout).toHaveBeenCalledWith('abc', cookies);
  });
});
