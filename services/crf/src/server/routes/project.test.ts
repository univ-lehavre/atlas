import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import { Effect } from 'effect';
import { CrfNetworkError } from '@univ-lehavre/atlas-crf-client';

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

const loadProject = async (): Promise<Hono> => {
  const mod = (await import('./project.js')) as { project: Hono };
  return mod.project;
};

describe('Project routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /version', () => {
    it('returns version wrapped in data', async () => {
      clientMock.getVersion.mockReturnValue(Effect.succeed('14.0.0'));

      const project = await loadProject();
      const res = await project.request('/version');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { version: string } };
      expect(body).toEqual({ data: { version: '14.0.0' } });
    });

    it('returns 503 when REDCap unreachable', async () => {
      clientMock.getVersion.mockReturnValue(
        Effect.fail(new CrfNetworkError({ cause: 'ECONNREFUSED' }))
      );

      const project = await loadProject();
      const res = await project.request('/version');

      expect(res.status).toBe(503);
    });
  });

  describe('GET /info', () => {
    it('returns project info', async () => {
      const info = { project_title: 'Atlas', project_id: 7 };
      clientMock.getProjectInfo.mockReturnValue(Effect.succeed(info));

      const project = await loadProject();
      const res = await project.request('/info');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: typeof info };
      expect(body.data).toEqual(info);
    });
  });

  describe('GET /instruments', () => {
    it('returns instruments list', async () => {
      const instruments = [{ instrument_name: 'demographics', instrument_label: 'Demographics' }];
      clientMock.getInstruments.mockReturnValue(Effect.succeed(instruments));

      const project = await loadProject();
      const res = await project.request('/instruments');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: typeof instruments };
      expect(body.data).toEqual(instruments);
    });
  });

  describe('GET /fields', () => {
    it('returns fields list', async () => {
      const fields = [{ field_name: 'record_id', field_type: 'text' }];
      clientMock.getFields.mockReturnValue(Effect.succeed(fields));

      const project = await loadProject();
      const res = await project.request('/fields');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: typeof fields };
      expect(body.data).toEqual(fields);
    });
  });

  describe('GET /export-field-names', () => {
    it('returns export field names list', async () => {
      const names = [{ original_field_name: 'q1', choice_value: '1', export_field_name: 'q1___1' }];
      clientMock.getExportFieldNames.mockReturnValue(Effect.succeed(names));

      const project = await loadProject();
      const res = await project.request('/export-field-names');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: typeof names };
      expect(body.data).toEqual(names);
    });
  });
});
