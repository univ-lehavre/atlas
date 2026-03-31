import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionError } from '@univ-lehavre/atlas-errors';
import { AppwriteException } from 'node-appwrite';

vi.mock('@univ-lehavre/atlas-appwrite', () => ({
  createSessionClient: vi.fn(),
}));

import { createSessionClient } from '@univ-lehavre/atlas-appwrite';
import {
  isExpectedAuthError,
  isNetworkError,
  extractSession,
  createSessionHandle,
} from './hooks.js';
import type { Cookies } from '@sveltejs/kit';

const mockCreateSessionClient = vi.mocked(createSessionClient);
const mockCookies = {} as Cookies;
const config = { appwrite: { endpoint: 'http://appwrite', projectId: 'proj' } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isExpectedAuthError', () => {
  it('should return true for SessionError', () => {
    const error = new SessionError('No session');
    expect(isExpectedAuthError(error)).toBe(true);
  });

  it('should return true for AppwriteException with code 401', () => {
    const error = new AppwriteException('Unauthorized', 401);
    expect(isExpectedAuthError(error)).toBe(true);
  });

  it('should return false for AppwriteException with other codes', () => {
    const error = new AppwriteException('Server error', 500);
    expect(isExpectedAuthError(error)).toBe(false);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Something broke');
    expect(isExpectedAuthError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isExpectedAuthError('string')).toBe(false);
    expect(isExpectedAuthError(null)).toBe(false);
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(isExpectedAuthError(undefined)).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('should return true for "fetch failed" message', () => {
    const error = new Error('fetch failed');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for ETIMEDOUT', () => {
    const error = new Error('Connection timed out');
    (error as Error & { cause: { code: string } }).cause = { code: 'ETIMEDOUT' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for ECONNREFUSED', () => {
    const error = new Error('Connection refused');
    (error as Error & { cause: { code: string } }).cause = { code: 'ECONNREFUSED' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for ENOTFOUND', () => {
    const error = new Error('DNS not found');
    (error as Error & { cause: { code: string } }).cause = { code: 'ENOTFOUND' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for ENETUNREACH', () => {
    const error = new Error('Network unreachable');
    (error as Error & { cause: { code: string } }).cause = { code: 'ENETUNREACH' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return false for other errors', () => {
    const error = new Error('Something else');
    expect(isNetworkError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isNetworkError('string')).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe('extractSession', () => {
  it('returns session when account.get() succeeds', async () => {
    mockCreateSessionClient.mockReturnValue({
      account: {
        get: vi.fn().mockResolvedValue({ $id: 'user-123', email: 'test@example.com' }),
      },
    } as never);

    const result = await extractSession(config, mockCookies);

    expect(result.session?.userId).toBe('user-123');
    expect(result.session?.userEmail).toBe('test@example.com');
    expect(result.connectivityError).toBeUndefined();
  });

  it('returns connectivityError on network failure', async () => {
    mockCreateSessionClient.mockReturnValue({
      account: { get: vi.fn().mockRejectedValue(new Error('fetch failed')) },
    } as never);

    const result = await extractSession(config, mockCookies);

    expect(result.connectivityError).toBe('appwrite_unavailable');
    expect(result.session).toBeUndefined();
  });

  it('returns empty result on expected auth error (SessionError)', async () => {
    mockCreateSessionClient.mockReturnValue({
      account: { get: vi.fn().mockRejectedValue(new SessionError('No session')) },
    } as never);

    const result = await extractSession(config, mockCookies);
    expect(result.session).toBeUndefined();
    expect(result.connectivityError).toBeUndefined();
  });

  it('returns empty result on unexpected error', async () => {
    mockCreateSessionClient.mockReturnValue({
      account: { get: vi.fn().mockRejectedValue(new Error('unexpected')) },
    } as never);

    const result = await extractSession(config, mockCookies);
    expect(result.session).toBeUndefined();
    expect(result.connectivityError).toBeUndefined();
  });
});

describe('createSessionHandle', () => {
  it('sets userId and userEmail on event.locals when session is valid', async () => {
    mockCreateSessionClient.mockReturnValue({
      account: { get: vi.fn().mockResolvedValue({ $id: 'u1', email: 'a@b.com' }) },
    } as never);

    const handle = createSessionHandle(config);
    const locals: Record<string, unknown> = {};
    const resolve = vi.fn().mockResolvedValue(new Response());

    await handle({ event: { cookies: mockCookies, locals }, resolve });

    expect(locals['userId']).toBe('u1');
    expect(locals['userEmail']).toBe('a@b.com');
    expect(resolve).toHaveBeenCalled();
  });

  it('sets connectivityError on locals when network fails', async () => {
    mockCreateSessionClient.mockReturnValue({
      account: { get: vi.fn().mockRejectedValue(new Error('fetch failed')) },
    } as never);

    const handle = createSessionHandle(config);
    const locals: Record<string, unknown> = {};

    await handle({
      event: { cookies: mockCookies, locals },
      resolve: vi.fn().mockResolvedValue(new Response()),
    });

    expect(locals['connectivityError']).toBe('appwrite_unavailable');
    expect(locals['userId']).toBeUndefined();
  });
});
