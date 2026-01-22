import { describe, it, expect, vi } from 'vitest';
import { Effect, pipe } from 'effect';
import {
  createRedcapClient,
  escapeFilterLogicValue,
  makeRedcapClientLayer,
  RedcapClientService,
} from './client.js';
import { RedcapUrl, RedcapToken, RecordId, InstrumentName } from './brands.js';
import { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';

describe('escapeFilterLogicValue', () => {
  it('should escape double quotes', () => {
    expect(escapeFilterLogicValue('test"value')).toBe(String.raw`test\"value`);
  });

  it('should escape backslashes', () => {
    expect(escapeFilterLogicValue(String.raw`test\value`)).toBe(String.raw`test\\value`);
  });

  it('should escape both quotes and backslashes', () => {
    expect(escapeFilterLogicValue(String.raw`test\"value`)).toBe(String.raw`test\\\"value`);
  });

  it('should return unchanged string if no special characters', () => {
    expect(escapeFilterLogicValue('testvalue')).toBe('testvalue');
  });

  it('should handle multiple quotes', () => {
    expect(escapeFilterLogicValue('"hello" "world"')).toBe(String.raw`\"hello\" \"world\"`);
  });

  it('should handle multiple backslashes', () => {
    expect(escapeFilterLogicValue(String.raw`a\b\c`)).toBe(String.raw`a\\b\\c`);
  });

  it('should handle empty string', () => {
    expect(escapeFilterLogicValue('')).toBe('');
  });

  it('should handle string with only special characters', () => {
    expect(escapeFilterLogicValue(String.raw`"\"`)).toBe(String.raw`\"\\\"`);
  });
});

describe('createRedcapClient', () => {
  const mockConfig = {
    url: RedcapUrl('https://redcap.example.com/api/'),
    token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
  };

  describe('exportRecords', () => {
    it('should return records on success', async () => {
      const mockRecords = [{ record_id: '1', name: 'Test' }];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRecords),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.exportRecords(), Effect.runPromise);

      expect(result).toEqual(mockRecords);
      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should fail with RedcapHttpError on non-ok response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.exportRecords(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapHttpError);
        expect((result.left as RedcapHttpError).status).toBe(401);
      }
    });

    it('should fail with RedcapApiError on API-level error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: 'Invalid token' }),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.exportRecords(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapApiError);
        expect((result.left as RedcapApiError).message).toBe('Invalid token');
      }
    });

    it('should fail with RedcapNetworkError on fetch error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.exportRecords(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapNetworkError);
      }
    });
  });

  describe('importRecords', () => {
    it('should return count on success', async () => {
      const mockResponse = { count: 5 };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const records = [{ record_id: '1' }, { record_id: '2' }];
      const result = await pipe(client.importRecords(records), Effect.runPromise);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSurveyLink', () => {
    it('should return survey URL on success', async () => {
      const surveyUrl = 'https://redcap.example.com/survey/abc123';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(surveyUrl),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(
        client.getSurveyLink(RecordId('abc12345678901234567'), InstrumentName('my_survey')),
        Effect.runPromise
      );

      expect(result).toBe(surveyUrl);
    });
  });

  describe('findUserIdByEmail', () => {
    it('should return userId when found', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ userid: 'user123' }]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.findUserIdByEmail('test@example.com'), Effect.runPromise);

      expect(result).toBe('user123');
    });

    it('should return null when not found', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(
        client.findUserIdByEmail('notfound@example.com'),
        Effect.runPromise
      );

      expect(result).toBeNull();
    });

    it('should escape email in filterLogic', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.findUserIdByEmail('test"injection@example.com'), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('test%5C%22injection%40example.com'); // URL encoded escaped quote
    });
  });

  describe('getVersion', () => {
    it('should return version string on success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('"13.7.0"'),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getVersion(), Effect.runPromise);

      expect(result).toBe('13.7.0');
    });

    it('should strip quotes from version response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('13.7.0'),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getVersion(), Effect.runPromise);

      expect(result).toBe('13.7.0');
    });

    it('should fail with RedcapHttpError on 403', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getVersion(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapHttpError);
        expect((result.left as RedcapHttpError).status).toBe(403);
      }
    });

    it('should send correct content parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('13.7.0'),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.getVersion(), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('content=version');
    });
  });

  describe('getProjectInfo', () => {
    it('should return project info on success', async () => {
      const mockProjectInfo = {
        project_id: 123,
        project_title: 'Test Project',
        creation_time: '2024-01-01 00:00:00',
        in_production: 1,
        record_autonumbering_enabled: 0,
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProjectInfo),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getProjectInfo(), Effect.runPromise);

      expect(result).toEqual(mockProjectInfo);
    });

    it('should fail with RedcapApiError on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: 'You do not have permissions' }),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getProjectInfo(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapApiError);
        expect((result.left as RedcapApiError).message).toBe('You do not have permissions');
      }
    });

    it('should send correct content parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ project_id: 1 }),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.getProjectInfo(), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('content=project');
    });
  });

  describe('getInstruments', () => {
    it('should return instruments array on success', async () => {
      const mockInstruments = [
        { instrument_name: 'demographics', instrument_label: 'Demographics Form' },
        { instrument_name: 'consent', instrument_label: 'Consent Form' },
      ];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInstruments),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getInstruments(), Effect.runPromise);

      expect(result).toEqual(mockInstruments);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no instruments', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getInstruments(), Effect.runPromise);

      expect(result).toEqual([]);
    });

    it('should send correct content parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.getInstruments(), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('content=instrument');
    });
  });

  describe('getFields', () => {
    it('should return fields array on success', async () => {
      const mockFields = [
        {
          field_name: 'record_id',
          form_name: 'demographics',
          field_type: 'text',
          field_label: 'Record ID',
          select_choices_or_calculations: '',
          field_note: '',
          text_validation_type_or_show_slider_number: '',
          text_validation_min: '',
          text_validation_max: '',
          identifier: '',
          branching_logic: '',
          required_field: 'y',
          custom_alignment: '',
          question_number: '',
          matrix_group_name: '',
          matrix_ranking: '',
          field_annotation: '',
        },
      ];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFields),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getFields(), Effect.runPromise);

      expect(result).toEqual(mockFields);
    });

    it('should send correct content parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.getFields(), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('content=metadata');
    });
  });

  describe('getExportFieldNames', () => {
    it('should return field name mappings on success', async () => {
      const mockFieldNames = [
        {
          original_field_name: 'symptoms',
          choice_value: '1',
          export_field_name: 'symptoms___1',
        },
        {
          original_field_name: 'symptoms',
          choice_value: '2',
          export_field_name: 'symptoms___2',
        },
      ];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFieldNames),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getExportFieldNames(), Effect.runPromise);

      expect(result).toEqual(mockFieldNames);
    });

    it('should send correct content parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.getExportFieldNames(), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('content=exportFieldNames');
    });
  });

  describe('downloadPdf', () => {
    it('should return ArrayBuffer on success', async () => {
      const pdfContent = new ArrayBuffer(100);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(pdfContent),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(
        client.downloadPdf(RecordId('abc12345678901234567'), InstrumentName('consent_form')),
        Effect.runPromise
      );

      expect(result).toBe(pdfContent);
      expect(result.byteLength).toBe(100);
    });

    it('should send correct parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(
        client.downloadPdf(RecordId('abc12345678901234567'), InstrumentName('my_form')),
        Effect.runPromise
      );

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('content=pdf');
      expect(callBody).toContain('record=abc12345678901234567');
      expect(callBody).toContain('instrument=my_form');
    });

    it('should fail with RedcapHttpError on 404', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Record not found'),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(
        client.downloadPdf(RecordId('abc12345678901234567'), InstrumentName('consent_form')),
        Effect.either,
        Effect.runPromise
      );

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapHttpError);
        expect((result.left as RedcapHttpError).status).toBe(404);
      }
    });
  });

  describe('exportRecords with options', () => {
    it('should include fields parameter when specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(
        client.exportRecords({ fields: ['record_id', 'first_name', 'last_name'] }),
        Effect.runPromise
      );

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('fields=record_id%2Cfirst_name%2Clast_name');
    });

    it('should include forms parameter when specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords({ forms: ['demographics', 'consent'] }), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('forms=demographics%2Cconsent');
    });

    it('should include filterLogic parameter when specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords({ filterLogic: '[age] >= 18' }), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('filterLogic');
    });

    it('should use eav type when specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords({ type: 'eav' }), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('type=eav');
    });

    it('should use label rawOrLabel when specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords({ rawOrLabel: 'label' }), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('rawOrLabel=label');
    });

    it('should not include empty fields array', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords({ fields: [] }), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).not.toContain('fields=');
    });

    it('should not include empty filterLogic', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords({ filterLogic: '' }), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).not.toContain('filterLogic=');
    });
  });

  describe('importRecords with options', () => {
    it('should use overwrite behavior when specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 1 }),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(
        client.importRecords([{ record_id: '1' }], { overwriteBehavior: 'overwrite' }),
        Effect.runPromise
      );

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('overwriteBehavior=overwrite');
    });

    it('should use returnContent ids when specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 1 }),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(
        client.importRecords([{ record_id: '1' }], { returnContent: 'ids' }),
        Effect.runPromise
      );

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('returnContent=ids');
    });

    it('should serialize records as JSON in data parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 2 }),
      });

      const records = [
        { record_id: '1', name: 'John' },
        { record_id: '2', name: 'Jane' },
      ];
      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.importRecords(records), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain('data=');
      // URL decoded should contain the JSON
      const params = new URLSearchParams(callBody);
      expect(JSON.parse(params.get('data')!)).toEqual(records);
    });
  });

  describe('RedcapClientService Layer', () => {
    it('should create a working layer', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('13.7.0'),
      });

      const layer = makeRedcapClientLayer(mockConfig, mockFetch as unknown as typeof fetch);

      const program = pipe(
        RedcapClientService,
        Effect.flatMap((client) => client.getVersion())
      );

      const result = await Effect.runPromise(Effect.provide(program, layer));
      expect(result).toBe('13.7.0');
    });

    it('should provide all client methods through the service', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ project_id: 123, project_title: 'Test' }),
      });

      const layer = makeRedcapClientLayer(mockConfig, mockFetch as unknown as typeof fetch);

      const program = pipe(
        RedcapClientService,
        Effect.flatMap((client) => client.getProjectInfo())
      );

      const result = await Effect.runPromise(Effect.provide(program, layer));
      expect(result.project_id).toBe(123);
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse error as RedcapNetworkError', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getProjectInfo(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapNetworkError);
      }
    });

    it('should handle text read error as RedcapNetworkError', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.reject(new Error('Read error')),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getVersion(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapNetworkError);
      }
    });

    it('should handle arrayBuffer read error as RedcapNetworkError', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.reject(new Error('Read error')),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(
        client.downloadPdf(RecordId('abc12345678901234567'), InstrumentName('form')),
        Effect.either,
        Effect.runPromise
      );

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapNetworkError);
      }
    });

    it('should handle error body read failure gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.reject(new Error('Cannot read body')),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      const result = await pipe(client.getVersion(), Effect.either, Effect.runPromise);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(RedcapNetworkError);
      }
    });
  });

  describe('request headers and format', () => {
    it('should use POST method', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords(), Effect.runPromise);

      expect(mockFetch.mock.calls[0]?.[1]?.method).toBe('POST');
    });

    it('should set correct Content-Type header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords(), Effect.runPromise);

      expect(mockFetch.mock.calls[0]?.[1]?.headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded'
      );
    });

    it('should set Accept header to application/json', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords(), Effect.runPromise);

      expect(mockFetch.mock.calls[0]?.[1]?.headers.Accept).toBe('application/json');
    });

    it('should include token in request body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords(), Effect.runPromise);

      const callBody = mockFetch.mock.calls[0]?.[1]?.body;
      expect(callBody).toContain(`token=${mockConfig.token}`);
    });

    it('should call correct URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = createRedcapClient(mockConfig, mockFetch as unknown as typeof fetch);
      await pipe(client.exportRecords(), Effect.runPromise);

      expect(mockFetch.mock.calls[0]?.[0]).toBe(mockConfig.url);
    });
  });
});
