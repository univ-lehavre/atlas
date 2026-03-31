import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signupWithEmail, login, logout, deleteUser } from './authService';
import type { Cookies } from '@sveltejs/kit';

// Mock dependencies
vi.mock('node-appwrite', () => ({ ID: { unique: vi.fn(() => 'unique-id') } }));

vi.mock('$env/static/public', () => ({ PUBLIC_LOGIN_URL: 'https://example.com' }));

vi.mock('$lib/appwrite/server', () => ({
  createAdminClient: vi.fn(),
  createSessionClient: vi.fn(),
}));

vi.mock('$lib/server/services/userService', () => ({ fetchUserId: vi.fn() }));

vi.mock('$lib/validators/server/auth', () => ({
  validateMagicUrlLogin: vi.fn(),
  validateSignupEmail: vi.fn(),
  validateUserId: vi.fn(),
}));

vi.mock('$lib/constants', () => ({ SESSION_COOKIE: 'session' }));

import { ID } from 'node-appwrite';
import { createAdminClient, createSessionClient } from '$lib/appwrite/server';
import { fetchUserId } from '$lib/server/services/userService';
import {
  validateMagicUrlLogin,
  validateSignupEmail,
  validateUserId,
} from '$lib/validators/server/auth';

const mockCreateAdminClient = vi.mocked(createAdminClient);
const mockCreateSessionClient = vi.mocked(createSessionClient);
const mockFetchUserId = vi.mocked(fetchUserId);
const mockValidateMagicUrlLogin = vi.mocked(validateMagicUrlLogin);
const mockValidateSignupEmail = vi.mocked(validateSignupEmail);
const mockValidateUserId = vi.mocked(validateUserId);
const mockIDUnique = vi.mocked(ID.unique);

describe('authService', () => {
  const mockCookies: Cookies = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
    serialize: vi.fn(),
  } as unknown as Cookies;

  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signupWithEmail', () => {
    const mockCreateMagicURLToken = vi.fn();

    beforeEach(() => {
      mockCreateAdminClient.mockReturnValue({
        account: { createMagicURLToken: mockCreateMagicURLToken },
      } as unknown as ReturnType<typeof createAdminClient>);
    });

    it('should create magic URL token with existing REDCap user ID', async () => {
      mockValidateSignupEmail.mockResolvedValue('test@example.com');
      mockFetchUserId.mockResolvedValue('redcap-user-id');
      mockCreateMagicURLToken.mockResolvedValue({
        userId: 'redcap-user-id',
        secret: 'token-secret',
      });

      const result = await signupWithEmail('test@example.com', { fetch: mockFetch });

      expect(mockValidateSignupEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockFetchUserId).toHaveBeenCalledWith(mockFetch, 'test@example.com');
      expect(mockCreateMagicURLToken).toHaveBeenCalledWith({
        userId: 'redcap-user-id',
        email: 'test@example.com',
        url: 'https://example.com/login',
      });
      expect(result).toEqual({ userId: 'redcap-user-id', secret: 'token-secret' });
    });

    it('should create magic URL token with unique ID when no REDCap user exists', async () => {
      mockValidateSignupEmail.mockResolvedValue('new@example.com');
      mockFetchUserId.mockResolvedValue(null);
      mockIDUnique.mockReturnValue('unique-id');
      mockCreateMagicURLToken.mockResolvedValue({ userId: 'unique-id', secret: 'token-secret' });

      const result = await signupWithEmail('new@example.com', { fetch: mockFetch });

      expect(mockFetchUserId).toHaveBeenCalledWith(mockFetch, 'new@example.com');
      expect(mockCreateMagicURLToken).toHaveBeenCalledWith({
        userId: 'unique-id',
        email: 'new@example.com',
        url: 'https://example.com/login',
      });
      expect(result).toEqual({ userId: 'unique-id', secret: 'token-secret' });
    });
  });

  describe('login', () => {
    const mockCreateSession = vi.fn();

    beforeEach(() => {
      mockCreateAdminClient.mockReturnValue({
        account: { createSession: mockCreateSession },
      } as unknown as ReturnType<typeof createAdminClient>);
    });

    it('should create session and set cookie', async () => {
      mockValidateMagicUrlLogin.mockReturnValue({ userId: 'user-123', secret: 'secret-abc' });
      mockCreateSession.mockResolvedValue({
        secret: 'session-secret',
        expire: '2026-02-01T00:00:00.000Z',
      });

      const result = await login('user-123', 'secret-abc', mockCookies);

      expect(mockValidateMagicUrlLogin).toHaveBeenCalledWith('user-123', 'secret-abc');
      expect(mockCreateSession).toHaveBeenCalledWith({ userId: 'user-123', secret: 'secret-abc' });
      expect(mockCookies.set).toHaveBeenCalledWith('session', 'session-secret', {
        sameSite: 'strict',
        expires: new Date('2026-02-01T00:00:00.000Z'),
        secure: true,
        path: '/',
      });
      expect(result).toEqual({ secret: 'session-secret', expire: '2026-02-01T00:00:00.000Z' });
    });
  });

  describe('logout', () => {
    const mockDeleteSessions = vi.fn();

    beforeEach(() => {
      mockCreateSessionClient.mockReturnValue({
        account: { deleteSessions: mockDeleteSessions },
      } as unknown as ReturnType<typeof createSessionClient>);
    });

    it('should delete sessions and remove cookie', async () => {
      mockValidateUserId.mockReturnValue('user-123');
      mockDeleteSessions.mockResolvedValue(undefined);

      await logout('user-123', mockCookies);

      expect(mockValidateUserId).toHaveBeenCalledWith('user-123');
      expect(mockDeleteSessions).toHaveBeenCalled();
      expect(mockCookies.delete).toHaveBeenCalledWith('session', { path: '/' });
    });
  });

  describe('deleteUser', () => {
    const mockDeleteSessions = vi.fn();
    const mockDeleteUser = vi.fn();

    beforeEach(() => {
      mockCreateSessionClient.mockReturnValue({
        account: { deleteSessions: mockDeleteSessions },
      } as unknown as ReturnType<typeof createSessionClient>);
      mockCreateAdminClient.mockReturnValue({
        users: { delete: mockDeleteUser },
      } as unknown as ReturnType<typeof createAdminClient>);
    });

    it('should logout and delete user', async () => {
      mockValidateUserId.mockReturnValue('user-123');
      mockDeleteSessions.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await deleteUser('user-123', mockCookies);

      expect(mockValidateUserId).toHaveBeenCalledWith('user-123');
      expect(mockDeleteSessions).toHaveBeenCalled();
      expect(mockDeleteUser).toHaveBeenCalledWith({ userId: 'user-123' });
    });
  });
});
