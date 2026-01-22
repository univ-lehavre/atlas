import { describe, it, expect, vi, beforeEach } from 'vitest';
import { records } from './records.js';
import * as redcapModule from '../redcap.js';
import { Effect } from 'effect';
import { RedcapNetworkError } from '@univ-lehavre/atlas-redcap-api';

// Mock the redcap module
vi.mock('../redcap.js', () => ({
  redcap: {
    exportRecords: vi.fn(),
    importRecords: vi.fn(),
    downloadPdf: vi.fn(),
    getSurveyLink: vi.fn(),
  },
}));

describe('Records Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /records', () => {
    it('exports all records successfully', async () => {
      const mockRecords = [
        { record_id: 'rec001', first_name: 'John', last_name: 'Doe' },
        { record_id: 'rec002', first_name: 'Jane', last_name: 'Smith' },
      ];

      vi.spyOn(redcapModule.redcap, 'exportRecords').mockReturnValue(Effect.succeed(mockRecords));

      const res = await records.request('/');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ data: mockRecords });
      expect(redcapModule.redcap.exportRecords).toHaveBeenCalledWith({ type: 'flat' });
    });

    it('exports records with fields filter', async () => {
      const mockRecords = [{ record_id: 'rec001', first_name: 'John' }];

      vi.spyOn(redcapModule.redcap, 'exportRecords').mockReturnValue(Effect.succeed(mockRecords));

      const res = await records.request('/?fields=record_id,first_name');
      expect(res.status).toBe(200);

      expect(redcapModule.redcap.exportRecords).toHaveBeenCalledWith({
        type: 'flat',
        fields: ['record_id', 'first_name'],
      });
    });

    it('exports records with forms filter', async () => {
      const mockRecords = [{ record_id: 'rec001', form_complete: '2' }];

      vi.spyOn(redcapModule.redcap, 'exportRecords').mockReturnValue(Effect.succeed(mockRecords));

      const res = await records.request('/?forms=demographics,baseline');
      expect(res.status).toBe(200);

      expect(redcapModule.redcap.exportRecords).toHaveBeenCalledWith({
        type: 'flat',
        forms: ['demographics', 'baseline'],
      });
    });

    it('exports records with filter logic', async () => {
      const mockRecords = [{ record_id: 'rec001' }];

      vi.spyOn(redcapModule.redcap, 'exportRecords').mockReturnValue(Effect.succeed(mockRecords));

      const res = await records.request('/?filterLogic=[age] > 18');
      expect(res.status).toBe(200);

      expect(redcapModule.redcap.exportRecords).toHaveBeenCalledWith({
        type: 'flat',
        filterLogic: '[age] > 18',
      });
    });

    it('exports records with rawOrLabel parameter', async () => {
      const mockRecords = [{ record_id: 'rec001', gender: 'Male' }];

      vi.spyOn(redcapModule.redcap, 'exportRecords').mockReturnValue(Effect.succeed(mockRecords));

      const res = await records.request('/?rawOrLabel=label');
      expect(res.status).toBe(200);

      expect(redcapModule.redcap.exportRecords).toHaveBeenCalledWith({
        type: 'flat',
        rawOrLabel: 'label',
      });
    });

    it('rejects invalid field names pattern', async () => {
      const res = await records.request('/?fields=invalid-field-name!');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('rejects invalid form names pattern', async () => {
      const res = await records.request('/?forms=Invalid-Form!');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'exportRecords').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await records.request('/');
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json).toEqual({
        data: null,
        error: {
          code: 'network_error',
          message: 'Failed to connect to REDCap',
        },
      });
    });
  });

  describe('PUT /records', () => {
    it('imports records successfully', async () => {
      const mockResponse = { count: 2 };

      vi.spyOn(redcapModule.redcap, 'importRecords').mockReturnValue(Effect.succeed(mockResponse));

      const res = await records.request('/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [
            { record_id: 'rec001', first_name: 'John' },
            { record_id: 'rec002', first_name: 'Jane' },
          ],
        }),
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ data: mockResponse });
      expect(redcapModule.redcap.importRecords).toHaveBeenCalledWith(
        [
          { record_id: 'rec001', first_name: 'John' },
          { record_id: 'rec002', first_name: 'Jane' },
        ],
        {}
      );
    });

    it('imports records with overwrite behavior', async () => {
      const mockResponse = { count: 1 };

      vi.spyOn(redcapModule.redcap, 'importRecords').mockReturnValue(Effect.succeed(mockResponse));

      const res = await records.request('/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{ record_id: 'rec001', first_name: 'Updated' }],
          overwriteBehavior: 'overwrite',
        }),
      });

      expect(res.status).toBe(200);
      expect(redcapModule.redcap.importRecords).toHaveBeenCalledWith(
        [{ record_id: 'rec001', first_name: 'Updated' }],
        { overwriteBehavior: 'overwrite' }
      );
    });

    it('rejects invalid request body', async () => {
      const res = await records.request('/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'body' }),
      });

      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'importRecords').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await records.request('/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{ record_id: 'rec001' }],
        }),
      });

      expect(res.status).toBe(503);
    });
  });

  describe('GET /records/:recordId/pdf', () => {
    it('downloads PDF successfully', async () => {
      const mockPdfBuffer = Buffer.from('fake pdf content');

      vi.spyOn(redcapModule.redcap, 'downloadPdf').mockReturnValue(Effect.succeed(mockPdfBuffer));

      const res = await records.request('/12345678901234567890/pdf?instrument=demographics');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain(
        'attachment; filename="record_12345678901234567890.pdf"'
      );

      const buffer = await res.arrayBuffer();
      expect(Buffer.from(buffer).toString()).toBe('fake pdf content');
    });

    it('uses default instrument when not specified', async () => {
      const mockPdfBuffer = Buffer.from('fake pdf content');

      vi.spyOn(redcapModule.redcap, 'downloadPdf').mockReturnValue(Effect.succeed(mockPdfBuffer));

      const res = await records.request('/12345678901234567890/pdf');
      expect(res.status).toBe(200);
    });

    it('rejects invalid record ID format', async () => {
      const res = await records.request('/invalid-id/pdf?instrument=demographics');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('redcap_api_error');
      expect(json.error.message).toContain('Invalid record ID');
    });

    it('rejects invalid instrument name format', async () => {
      const res = await records.request('/12345678901234567890/pdf?instrument=Invalid-Name!');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'downloadPdf').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await records.request('/12345678901234567890/pdf?instrument=demographics');
      expect(res.status).toBe(503);
    });
  });

  describe('GET /records/:recordId/survey-link', () => {
    it('returns survey link successfully', async () => {
      const mockUrl = 'https://redcap.example.com/surveys/?s=ABCDEF123456';

      vi.spyOn(redcapModule.redcap, 'getSurveyLink').mockReturnValue(Effect.succeed(mockUrl));

      const res = await records.request(
        '/12345678901234567890/survey-link?instrument=demographics'
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ data: { url: mockUrl } });
    });

    it('rejects invalid record ID format', async () => {
      const res = await records.request('/invalid-id/survey-link?instrument=demographics');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('redcap_api_error');
      expect(json.error.message).toContain('Invalid record ID');
    });

    it('rejects invalid instrument name format', async () => {
      const res = await records.request(
        '/12345678901234567890/survey-link?instrument=Invalid-Name!'
      );
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('requires instrument parameter', async () => {
      const res = await records.request('/12345678901234567890/survey-link');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('validation_error');
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'getSurveyLink').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await records.request(
        '/12345678901234567890/survey-link?instrument=demographics'
      );
      expect(res.status).toBe(503);
    });
  });
});
