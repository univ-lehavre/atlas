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

const loadRecords = async (): Promise<Hono> => {
  const mod = (await import('./records.js')) as { records: Hono };
  return mod.records;
};

// Record ID matching ^[a-z0-9]{20,}$ (used by RecordId brand)
const VALID_RECORD_ID = 'abcdefghij0123456789';

describe('Records routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET / (export records)', () => {
    it('exports without filters', async () => {
      clientMock.exportRecords.mockReturnValue(Effect.succeed([{ record_id: '1' }]));

      const records = await loadRecords();
      const res = await records.request('/');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown };
      expect(body.data).toEqual([{ record_id: '1' }]);
      expect(clientMock.exportRecords).toHaveBeenCalledWith({ type: 'flat' });
    });

    it('forwards fields, forms, filterLogic, rawOrLabel when provided', async () => {
      clientMock.exportRecords.mockReturnValue(Effect.succeed([]));

      const records = await loadRecords();
      const url =
        '/?fields=record_id,name&forms=demographics&filterLogic=[age]>18&rawOrLabel=label';
      const res = await records.request(url);

      expect(res.status).toBe(200);
      expect(clientMock.exportRecords).toHaveBeenCalledWith({
        fields: ['record_id', 'name'],
        forms: ['demographics'],
        filterLogic: '[age]>18',
        rawOrLabel: 'label',
        type: 'flat',
      });
    });

    it('returns 400 on invalid rawOrLabel value', async () => {
      const records = await loadRecords();
      const res = await records.request('/?rawOrLabel=bogus');

      expect(res.status).toBe(400);
      expect(clientMock.exportRecords).not.toHaveBeenCalled();
    });

    it('returns 400 on invalid fields pattern (contains hyphen)', async () => {
      const records = await loadRecords();
      const res = await records.request('/?fields=bad-field');

      expect(res.status).toBe(400);
    });

    it('returns 503 when REDCap unreachable', async () => {
      clientMock.exportRecords.mockReturnValue(
        Effect.fail(new CrfNetworkError({ cause: 'ECONNREFUSED' }))
      );

      const records = await loadRecords();
      const res = await records.request('/');

      expect(res.status).toBe(503);
    });
  });

  describe('PUT / (import records)', () => {
    it('imports a list of records and returns wrapped result', async () => {
      clientMock.importRecords.mockReturnValue(Effect.succeed({ count: 1 }));

      const records = await loadRecords();
      const body = { records: [{ record_id: '1', name: 'A' }] };
      const res = await records.request('/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as { data: { count: number } };
      expect(json.data).toEqual({ count: 1 });
      expect(clientMock.importRecords).toHaveBeenCalledWith(body.records, {});
    });

    it('forwards overwriteBehavior when provided', async () => {
      clientMock.importRecords.mockReturnValue(Effect.succeed({ count: 1 }));

      const records = await loadRecords();
      const body = {
        records: [{ record_id: '1' }],
        overwriteBehavior: 'overwrite' as const,
      };
      const res = await records.request('/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(200);
      expect(clientMock.importRecords).toHaveBeenCalledWith(body.records, {
        overwriteBehavior: 'overwrite',
      });
    });

    it('returns 400 for invalid body (missing records)', async () => {
      const records = await loadRecords();
      const res = await records.request('/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      expect(clientMock.importRecords).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid overwriteBehavior value', async () => {
      const records = await loadRecords();
      const res = await records.request('/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [], overwriteBehavior: 'wrong' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /:recordId/pdf', () => {
    it('returns the PDF buffer with proper headers', async () => {
      const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
      clientMock.downloadPdf.mockReturnValue(Effect.succeed(pdf));

      const records = await loadRecords();
      const res = await records.request(`/${VALID_RECORD_ID}/pdf?instrument=demographics`);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain(
        `filename="record_${VALID_RECORD_ID}.pdf"`
      );
      expect(clientMock.downloadPdf).toHaveBeenCalledTimes(1);
    });

    it('defaults instrument to "form" when not provided', async () => {
      const pdf = new Uint8Array([0x25]).buffer;
      clientMock.downloadPdf.mockReturnValue(Effect.succeed(pdf));

      const records = await loadRecords();
      const res = await records.request(`/${VALID_RECORD_ID}/pdf`);

      expect(res.status).toBe(200);
      const calls = clientMock.downloadPdf.mock.calls as readonly [unknown, string][];
      expect(calls[0]?.[1]).toBe('form');
    });

    it('returns 400 on invalid instrument pattern', async () => {
      const records = await loadRecords();
      const res = await records.request(`/${VALID_RECORD_ID}/pdf?instrument=Bad-Name`);

      expect(res.status).toBe(400);
      expect(clientMock.downloadPdf).not.toHaveBeenCalled();
    });

    it('returns 400 when record id contains forbidden chars', async () => {
      // The RecordId brand only accepts /^[\w-]+$/, so a dot triggers the error
      const records = await loadRecords();
      const res = await records.request('/bad.id/pdf?instrument=demographics');

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toContain('Invalid record ID');
    });

    it('returns 503 on network error', async () => {
      clientMock.downloadPdf.mockReturnValue(
        Effect.fail(new CrfNetworkError({ cause: 'ECONNREFUSED' }))
      );

      const records = await loadRecords();
      const res = await records.request(`/${VALID_RECORD_ID}/pdf?instrument=demographics`);

      expect(res.status).toBe(503);
    });
  });

  describe('GET /:recordId/survey-link', () => {
    it('returns the survey link wrapped in data', async () => {
      clientMock.getSurveyLink.mockReturnValue(
        Effect.succeed('https://redcap.example.com/surveys/?s=ABCDEF')
      );

      const records = await loadRecords();
      const res = await records.request(`/${VALID_RECORD_ID}/survey-link?instrument=demographics`);

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { url: string } };
      expect(body.data.url).toBe('https://redcap.example.com/surveys/?s=ABCDEF');
    });

    it('returns 400 when instrument query param missing', async () => {
      const records = await loadRecords();
      const res = await records.request(`/${VALID_RECORD_ID}/survey-link`);

      expect(res.status).toBe(400);
      expect(clientMock.getSurveyLink).not.toHaveBeenCalled();
    });

    it('returns 400 when record id is invalid', async () => {
      const records = await loadRecords();
      const res = await records.request('/bad.id/survey-link?instrument=demographics');

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toContain('Invalid record ID');
    });

    it('returns 503 on network error', async () => {
      clientMock.getSurveyLink.mockReturnValue(
        Effect.fail(new CrfNetworkError({ cause: 'ECONNREFUSED' }))
      );

      const records = await loadRecords();
      const res = await records.request(`/${VALID_RECORD_ID}/survey-link?instrument=demographics`);

      expect(res.status).toBe(503);
    });
  });
});
