import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import { Effect } from 'effect';
import { CrfHttpError, CrfNetworkError } from '@univ-lehavre/atlas-crf-client';

const clientMock = {
  getVersion: vi.fn(),
  getProjectInfo: vi.fn(),
  getInstruments: vi.fn(),
  getFields: vi.fn(),
  getExportFieldNames: vi.fn(),
  exportRecords: vi.fn(),
  importRecords: vi.fn(),
  getSurveyLink: vi.fn(),
  downloadPdf: vi.fn(),
  exportFile: vi.fn(),
  importFile: vi.fn(),
  findUserIdByEmail: vi.fn(),
};

vi.mock('../client.js', () => ({ client: clientMock }));

const loadUsers = async (): Promise<Hono> => {
  const mod = (await import('./users.js')) as { users: Hono };
  return mod.users;
};

describe('Users routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /by-email', () => {
    it('returns user id wrapped in data on success', async () => {
      clientMock.findUserIdByEmail.mockReturnValue(Effect.succeed('user_42'));

      const users = await loadUsers();
      const res = await users.request('/by-email?email=user@example.com');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { userId: string } };
      expect(body).toEqual({ data: { userId: 'user_42' } });
      expect(clientMock.findUserIdByEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('returns 400 when email is invalid', async () => {
      const users = await loadUsers();
      const res = await users.request('/by-email?email=not-an-email');

      expect(res.status).toBe(400);
      const body = (await res.json()) as { data: null; error: { code: string } };
      expect(body.data).toBeNull();
      expect(body.error.code).toBe('validation_error');
      expect(clientMock.findUserIdByEmail).not.toHaveBeenCalled();
    });

    it('returns 400 when email query param missing', async () => {
      const users = await loadUsers();
      const res = await users.request('/by-email');

      expect(res.status).toBe(400);
    });

    it('returns 400 user_not_found when client resolves null', async () => {
      clientMock.findUserIdByEmail.mockReturnValue(Effect.succeed(null));

      const users = await loadUsers();
      const res = await users.request('/by-email?email=missing@example.com');

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('user_not_found');
    });

    it('returns 400 user_not_found when client resolves empty string', async () => {
      clientMock.findUserIdByEmail.mockReturnValue(Effect.succeed(''));

      const users = await loadUsers();
      const res = await users.request('/by-email?email=missing@example.com');

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('user_not_found');
    });

    it('returns 503 on network error', async () => {
      clientMock.findUserIdByEmail.mockReturnValue(
        Effect.fail(new CrfNetworkError({ cause: 'ECONNREFUSED' }))
      );

      const users = await loadUsers();
      const res = await users.request('/by-email?email=user@example.com');

      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('network_error');
    });

    it('propagates upstream http error status', async () => {
      clientMock.findUserIdByEmail.mockReturnValue(
        Effect.fail(new CrfHttpError({ status: 502, statusText: 'Bad Gateway' }))
      );

      const users = await loadUsers();
      const res = await users.request('/by-email?email=user@example.com');

      expect(res.status).toBe(502);
    });
  });
});
