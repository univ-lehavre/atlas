import { describe, it, expect, vi, beforeEach } from 'vitest';
import { project } from './project.js';
import * as redcapModule from '../redcap.js';
import { Effect } from 'effect';
import { RedcapNetworkError } from '@univ-lehavre/atlas-redcap-api';

// Mock the redcap module
vi.mock('../redcap.js', () => ({
  redcap: {
    getVersion: vi.fn(),
    getProjectInfo: vi.fn(),
    getInstruments: vi.fn(),
    getFields: vi.fn(),
    getExportFieldNames: vi.fn(),
  },
}));

describe('Project Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /version', () => {
    it('returns version successfully', async () => {
      vi.spyOn(redcapModule.redcap, 'getVersion').mockReturnValue(Effect.succeed('14.0.0'));

      const res = await project.request('/version');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ data: { version: '14.0.0' } });
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'getVersion').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await project.request('/version');
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

  describe('GET /info', () => {
    it('returns project info successfully', async () => {
      const mockProjectInfo = {
        project_id: '123',
        project_title: 'Test Project',
        creation_time: '2024-01-01 00:00:00',
        in_production: '1',
        project_language: 'English',
        purpose: '0',
      };

      vi.spyOn(redcapModule.redcap, 'getProjectInfo').mockReturnValue(
        Effect.succeed(mockProjectInfo)
      );

      const res = await project.request('/info');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ data: mockProjectInfo });
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'getProjectInfo').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await project.request('/info');
      expect(res.status).toBe(503);
    });
  });

  describe('GET /instruments', () => {
    it('returns instruments successfully', async () => {
      const mockInstruments = [
        { instrument_name: 'demographics', instrument_label: 'Demographics' },
        { instrument_name: 'baseline_data', instrument_label: 'Baseline Data' },
      ];

      vi.spyOn(redcapModule.redcap, 'getInstruments').mockReturnValue(
        Effect.succeed(mockInstruments)
      );

      const res = await project.request('/instruments');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ data: mockInstruments });
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'getInstruments').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await project.request('/instruments');
      expect(res.status).toBe(503);
    });
  });

  describe('GET /fields', () => {
    it('returns fields successfully', async () => {
      const mockFields = [
        {
          field_name: 'record_id',
          form_name: 'demographics',
          field_type: 'text',
          field_label: 'Record ID',
        },
        {
          field_name: 'first_name',
          form_name: 'demographics',
          field_type: 'text',
          field_label: 'First Name',
        },
      ];

      vi.spyOn(redcapModule.redcap, 'getFields').mockReturnValue(Effect.succeed(mockFields));

      const res = await project.request('/fields');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ data: mockFields });
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'getFields').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await project.request('/fields');
      expect(res.status).toBe(503);
    });
  });

  describe('GET /export-field-names', () => {
    it('returns export field names successfully', async () => {
      const mockExportFieldNames = [
        { original_field_name: 'checkbox___1', choice_value: '1', export_field_name: 'checkbox' },
        { original_field_name: 'checkbox___2', choice_value: '2', export_field_name: 'checkbox' },
      ];

      vi.spyOn(redcapModule.redcap, 'getExportFieldNames').mockReturnValue(
        Effect.succeed(mockExportFieldNames)
      );

      const res = await project.request('/export-field-names');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ data: mockExportFieldNames });
    });

    it('handles network errors', async () => {
      vi.spyOn(redcapModule.redcap, 'getExportFieldNames').mockReturnValue(
        Effect.fail(new RedcapNetworkError({ cause: new Error('Connection failed') }))
      );

      const res = await project.request('/export-field-names');
      expect(res.status).toBe(503);
    });
  });
});
