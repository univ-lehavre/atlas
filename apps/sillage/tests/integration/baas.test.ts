import { describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';

import { createSessionClient } from '../../src/lib/server/baas';

describe('lib/server/baas', () => {
  it('createSessionClient returns an object with an account property', () => {
    const cookies = {
      get: vi.fn(() => 'fake-session'),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(() => []),
      serialize: vi.fn(),
    } as unknown as Cookies;
    const client = createSessionClient(cookies);
    expect(client).toBeDefined();
    expect(client.account).toBeDefined();
    // The Appwrite SDK exposes `get`, `createSession`, `deleteSession`, etc.
    expect(typeof client.account.get).toBe('function');
  });
});
