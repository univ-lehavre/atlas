import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { ID } from 'node-appwrite';

vi.mock('@univ-lehavre/atlas-baas', () => ({
  createAdminClient: vi.fn(),
  createSessionClient: vi.fn(),
  SESSION_COOKIE: 'atlas-session',
}));

import { createAdminClient, createSessionClient } from '@univ-lehavre/atlas-baas';
import { createAuthService, type AuthConfig } from './index.js';

const mockCreateAdminClient = vi.mocked(createAdminClient);
const mockCreateSessionClient = vi.mocked(createSessionClient);

const baseConfig: AuthConfig = {
  baas: { endpoint: 'http://appwrite', projectId: 'proj', apiKey: 'key' },
  loginUrl: 'https://app.example.com',
  domainValidation: { allowedDomainsRegexp: String.raw`^.+@example\.com$` },
};

const cookies = {
  set: vi.fn(),
  delete: vi.fn(),
} as unknown as Cookies;

const setupAccount = (token: unknown): ReturnType<typeof vi.fn> => {
  const createMagicURLToken = vi.fn().mockResolvedValue(token);
  mockCreateAdminClient.mockReturnValue({ account: { createMagicURLToken } } as never);
  return createMagicURLToken;
};

const defaultToken = { secret: 'tok' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ID, 'unique').mockReturnValue('generated-id');
});

describe('createAuthService.signupWithEmail', () => {
  it('uses resolveUserId when it returns an id', async () => {
    const createMagicURLToken = setupAccount(defaultToken);
    const service = createAuthService({
      ...baseConfig,
      resolveUserId: vi.fn().mockResolvedValue('resolved-id'),
    });

    await service.signupWithEmail('user@example.com');

    expect(createMagicURLToken).toHaveBeenCalledWith({
      userId: 'resolved-id',
      email: 'user@example.com',
      url: 'https://app.example.com/login',
    });
  });

  it('falls back to ID.unique when resolveUserId returns undefined', async () => {
    const createMagicURLToken = setupAccount(defaultToken);
    const service = createAuthService({
      ...baseConfig,
      // eslint-disable-next-line unicorn/no-useless-undefined -- explicit undefined exercises the fallback to ID.unique()
      resolveUserId: vi.fn().mockResolvedValue(undefined),
    });

    await service.signupWithEmail('user@example.com');

    expect(createMagicURLToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'generated-id' })
    );
  });

  it('uses ID.unique when no resolveUserId is provided', async () => {
    const createMagicURLToken = setupAccount(defaultToken);
    const service = createAuthService(baseConfig);

    await service.signupWithEmail('user@example.com');

    expect(createMagicURLToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'generated-id' })
    );
  });

  it('returns the token from Appwrite', async () => {
    const expected = { secret: 'token-value' };
    setupAccount(expected);
    const service = createAuthService(baseConfig);

    const result = await service.signupWithEmail('user@example.com');

    expect(result).toBe(expected);
  });

  it('rejects when email validation fails', async () => {
    const service = createAuthService(baseConfig);
    await expect(service.signupWithEmail('user@unknown.com')).rejects.toThrow();
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });
});

describe('createAuthService.login', () => {
  const validUserId = 'abcdef0123456789';
  const validSecret = 'fedcba9876543210';

  it('creates a session and sets the session cookie', async () => {
    const expire = '2030-01-01T00:00:00.000Z';
    const session = { secret: 'session-secret', expire };
    const createSession = vi.fn().mockResolvedValue(session);
    mockCreateAdminClient.mockReturnValue({ account: { createSession } } as never);

    const service = createAuthService(baseConfig);
    const result = await service.login(validUserId, validSecret, cookies);

    expect(createSession).toHaveBeenCalledWith({ userId: validUserId, secret: validSecret });
    expect(cookies.set).toHaveBeenCalledWith('atlas-session', 'session-secret', {
      httpOnly: true,
      sameSite: 'strict',
      expires: new Date(expire),
      secure: true,
      path: '/',
    });
    expect(result).toBe(session);
  });

  it('rejects on invalid magic URL parameters without touching Appwrite', async () => {
    const service = createAuthService(baseConfig);
    await expect(service.login('not-hex', validSecret, cookies)).rejects.toThrow();
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
    expect(cookies.set).not.toHaveBeenCalled();
  });
});

describe('createAuthService.logout', () => {
  const validUserId = 'abcdef0123456789';

  it('deletes Appwrite sessions and clears the cookie', async () => {
    const deleteSessions = vi.fn(() => Promise.resolve());
    mockCreateSessionClient.mockReturnValue({ account: { deleteSessions } } as never);

    const service = createAuthService(baseConfig);
    await service.logout(validUserId, cookies);

    expect(deleteSessions).toHaveBeenCalled();
    expect(cookies.delete).toHaveBeenCalledWith('atlas-session', { path: '/' });
  });

  it('rejects on invalid userId without touching Appwrite', async () => {
    const service = createAuthService(baseConfig);
    await expect(service.logout('', cookies)).rejects.toThrow();
    expect(mockCreateSessionClient).not.toHaveBeenCalled();
    expect(cookies.delete).not.toHaveBeenCalled();
  });
});

describe('createAuthService.deleteUser', () => {
  const validUserId = 'abcdef0123456789';

  it('logs out then deletes the user', async () => {
    const deleteSessions = vi.fn(() => Promise.resolve());
    const deleteUser = vi.fn(() => Promise.resolve());
    mockCreateSessionClient.mockReturnValue({ account: { deleteSessions } } as never);
    mockCreateAdminClient.mockReturnValue({ users: { delete: deleteUser } } as never);

    const service = createAuthService(baseConfig);
    await service.deleteUser(validUserId, cookies);

    expect(deleteSessions).toHaveBeenCalled();
    expect(cookies.delete).toHaveBeenCalledWith('atlas-session', { path: '/' });
    expect(deleteUser).toHaveBeenCalledWith({ userId: validUserId });
  });

  it('rejects on invalid userId without calling Appwrite', async () => {
    const service = createAuthService(baseConfig);
    await expect(service.deleteUser('not-hex', cookies)).rejects.toThrow();
    expect(mockCreateSessionClient).not.toHaveBeenCalled();
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });
});
