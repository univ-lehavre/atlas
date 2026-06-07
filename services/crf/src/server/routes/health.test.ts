import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import { Effect } from 'effect';
import { CrfNetworkError, CrfHttpError } from '@univ-lehavre/atlas-crf-client';
import { makeTestRuntime } from '../test-support.js';
import { makeHealthRoutes } from './health.js';

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

// Routes injected with the mock client via a test runtime (ADR 0049).
const loadHealth = (): Hono => makeHealthRoutes(makeTestRuntime(clientMock));

describe('Health routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('returns 200 with status ok', async () => {
      const health = loadHealth();
      const res = await health.request('/');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /detailed', () => {
    it('returns 200 ok when REDCap and token healthy', async () => {
      clientMock.getVersion.mockReturnValue(Effect.succeed('14.0.0'));
      clientMock.getProjectInfo.mockReturnValue(
        Effect.succeed({ project_title: 'Test Project', project_id: 42 })
      );

      const health = loadHealth();
      const res = await health.request('/detailed');
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        status: string;
        checks: { crf: { status: string }; token: { status: string } };
        crf?: { version: string; project: string; projectId: number };
      };
      expect(body.status).toBe('ok');
      expect(body.checks.crf.status).toBe('ok');
      expect(body.checks.token.status).toBe('ok');
      expect(body.crf).toEqual({ version: '14.0.0', project: 'Test Project', projectId: 42 });
    });

    it('returns 503 when REDCap unreachable (network error)', async () => {
      clientMock.getVersion.mockReturnValue(
        Effect.fail(new CrfNetworkError({ cause: 'ECONNREFUSED' }))
      );

      const health = loadHealth();
      const res = await health.request('/detailed');
      expect(res.status).toBe(503);

      const body = (await res.json()) as {
        status: string;
        checks: { crf: { status: string }; token: { status: string; message?: string } };
      };
      expect(body.status).toBe('error');
      expect(body.checks.crf.status).toBe('error');
      expect(body.checks.token.status).toBe('error');
      expect(body.checks.token.message).toBe('Skipped - REDCap unreachable');
    });

    it('returns 503 with error when token check fails', async () => {
      clientMock.getVersion.mockReturnValue(Effect.succeed('14.0.0'));
      clientMock.getProjectInfo.mockReturnValue(
        Effect.fail(new CrfHttpError({ status: 403, statusText: 'Forbidden' }))
      );

      const health = loadHealth();
      const res = await health.request('/detailed');
      expect(res.status).toBe(503);

      const body = (await res.json()) as {
        status: string;
        checks: { crf: { status: string }; token: { status: string } };
      };
      expect(body.status).toBe('error');
      expect(body.checks.crf.status).toBe('ok');
      expect(body.checks.token.status).toBe('error');
    });
  });
});
