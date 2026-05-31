import { describe, it, expect, vi } from 'vitest';
import { Effect } from 'effect';
import {
  createCrfClient,
  CrfUrl,
  CrfToken,
  escapeFilterLogicValue,
  makeCrfClientLayer,
  CrfClientService,
} from './index.js';

/**
 * Unit and integration tests for REDCap client.
 */

// Mock fetch factory
const createMockFetch = (
  responses: {
    ok: boolean;
    status?: number;
    body: unknown;
    isText?: boolean;
  }[]
) => {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    // eslint-disable-next-line security/detect-object-injection -- `callIndex` est un compteur de mock contrôlé localement
    const response = responses[callIndex] ?? responses.at(-1);
    callIndex++;

    return Promise.resolve({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: () => Promise.resolve(response.body),
      text: () =>
        Promise.resolve(
          response.isText ? (response.body as string) : JSON.stringify(response.body)
        ),
      arrayBuffer: () =>
        Promise.resolve(
          response.body instanceof ArrayBuffer
            ? response.body
            : new TextEncoder().encode(String(response.body)).buffer
        ),
    });
  });
};

describe('REDCap Client', () => {
  const VALID_URL = 'http://localhost:8080/api';
  const VALID_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  describe('Branded Types', () => {
    it('should accept valid CrfToken', () => {
      expect(() => CrfToken(VALID_TOKEN)).not.toThrow();
    });

    it('should reject invalid CrfToken (lowercase)', () => {
      expect(() => CrfToken('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toThrow();
    });

    it('should reject invalid CrfToken (wrong length)', () => {
      expect(() => CrfToken('AABBCCDD')).toThrow();
    });

    it('should accept valid CrfUrl', () => {
      expect(() => CrfUrl('https://redcap.example.com/api/')).not.toThrow();
    });
  });

  describe('Client Creation', () => {
    it('should create client with valid config', () => {
      const client = createCrfClient({
        url: CrfUrl(VALID_URL),
        token: CrfToken(VALID_TOKEN),
      });

      expect(client).toBeDefined();
      expect(client.getVersion).toBeDefined();
      expect(client.getProjectInfo).toBeDefined();
      expect(client.exportRecords).toBeDefined();
      expect(client.importRecords).toBeDefined();
      expect(client.getInstruments).toBeDefined();
      expect(client.getFields).toBeDefined();
      expect(client.getExportFieldNames).toBeDefined();
      expect(client.getSurveyLink).toBeDefined();
      expect(client.downloadPdf).toBeDefined();
      expect(client.findUserIdByEmail).toBeDefined();
    });

    it('appends trailing slash to URL when missing (REDCap quirk)', async () => {
      const mockFetch = vi.fn(
        async () => new Response('"14.0.0"', { status: 200 })
      ) as unknown as typeof fetch;

      const client = createCrfClient(
        { url: CrfUrl('http://localhost:8080/api'), token: CrfToken(VALID_TOKEN) },
        mockFetch
      );

      await Effect.runPromise(client.getVersion());

      const calls = (mockFetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.at(-1)?.[0]).toBe('http://localhost:8080/api/');
    });

    it('preserves trailing slash when already present', async () => {
      const mockFetch = vi.fn(
        async () => new Response('"14.0.0"', { status: 200 })
      ) as unknown as typeof fetch;

      const client = createCrfClient(
        { url: CrfUrl('http://localhost:8080/api/'), token: CrfToken(VALID_TOKEN) },
        mockFetch
      );

      await Effect.runPromise(client.getVersion());

      const calls = (mockFetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.at(-1)?.[0]).toBe('http://localhost:8080/api/');
    });
  });

  describe('escapeFilterLogicValue', () => {
    it('should escape double quotes', () => {
      expect(escapeFilterLogicValue('test"value')).toBe(String.raw`test\"value`);
    });

    it('should escape backslashes', () => {
      expect(escapeFilterLogicValue(String.raw`test\value`)).toBe(String.raw`test\\value`);
    });

    it('should escape both quotes and backslashes', () => {
      expect(escapeFilterLogicValue(String.raw`a\b"c`)).toBe(String.raw`a\\b\"c`);
    });

    it('should leave safe strings unchanged', () => {
      expect(escapeFilterLogicValue('test@example.com')).toBe('test@example.com');
    });

    it('should handle empty string', () => {
      expect(escapeFilterLogicValue('')).toBe('');
    });
  });

  describe('API Methods with Mocked Fetch', () => {
    describe('getVersion', () => {
      it('should return version string', async () => {
        const mockFetch = createMockFetch([{ ok: true, body: '"14.5.10"', isText: true }]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const version = await Effect.runPromise(client.getVersion());
        expect(version).toBe('14.5.10');
      });

      it('should trim and strip quotes from version', async () => {
        const mockFetch = createMockFetch([{ ok: true, body: '  "15.0.0"  ', isText: true }]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const version = await Effect.runPromise(client.getVersion());
        expect(version).toBe('15.0.0');
      });

      it('should handle HTTP errors', async () => {
        const mockFetch = createMockFetch([
          { ok: false, status: 401, body: 'Unauthorized', isText: true },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromiseExit(client.getVersion());
        expect(result._tag).toBe('Failure');
      });
    });

    describe('getProjectInfo', () => {
      it('should return project info with version auto-detection', async () => {
        const projectInfo = {
          project_id: 123,
          project_title: 'Test Project',
          purpose: 0,
          is_longitudinal: 0,
        };

        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true }, // Version call
          { ok: true, body: projectInfo }, // Project info call
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const info = await Effect.runPromise(client.getProjectInfo());
        expect(info.project_id).toBe(123);
        expect(info.project_title).toBe('Test Project');
      });

      it('should cache version after first call', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true }, // Version call (only once)
          { ok: true, body: { project_id: 1, project_title: 'P1' } },
          { ok: true, body: { project_id: 2, project_title: 'P2' } },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        await Effect.runPromise(client.getProjectInfo());
        await Effect.runPromise(client.getProjectInfo());

        // Version should only be fetched once
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    describe('getInstruments', () => {
      it('should return instruments array', async () => {
        const instruments = [
          { instrument_name: 'survey1', instrument_label: 'Survey 1' },
          { instrument_name: 'survey2', instrument_label: 'Survey 2' },
        ];

        const mockFetch = createMockFetch([{ ok: true, body: instruments }]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromise(client.getInstruments());
        expect(result).toHaveLength(2);
        expect(result[0]?.instrument_name).toBe('survey1');
      });
    });

    describe('getFields', () => {
      it('should return fields array', async () => {
        const fields = [
          { field_name: 'record_id', field_type: 'text' },
          { field_name: 'age', field_type: 'text' },
        ];

        const mockFetch = createMockFetch([{ ok: true, body: fields }]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromise(client.getFields());
        expect(result).toHaveLength(2);
        expect(result[0]?.field_name).toBe('record_id');
      });
    });

    describe('exportRecords', () => {
      it('should export records with default options', async () => {
        const records = [{ record_id: '1', name: 'Test' }];

        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true }, // Version
          { ok: true, body: records },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromise(client.exportRecords());
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ record_id: '1', name: 'Test' });
      });

      it('should export records with fields filter', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: [{ record_id: '1' }] },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        await Effect.runPromise(client.exportRecords({ fields: ['record_id', 'name'] }));

        // Check the request params
        const lastCall = mockFetch.mock.calls[1];
        const body = lastCall[1]?.body as string;
        expect(body).toContain('fields=record_id%2Cname');
      });

      it('should export records with forms filter', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: [] },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        await Effect.runPromise(client.exportRecords({ forms: ['demographics', 'survey'] }));

        const lastCall = mockFetch.mock.calls[1];
        const body = lastCall[1]?.body as string;
        expect(body).toContain('forms=demographics%2Csurvey');
      });

      it('should export records with filterLogic', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: [] },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        await Effect.runPromise(client.exportRecords({ filterLogic: '[age] > 18' }));

        const lastCall = mockFetch.mock.calls[1];
        const body = lastCall[1]?.body as string;
        expect(body).toContain('filterLogic');
      });

      it('should handle API error response', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: { error: 'Invalid field name' } },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromiseExit(client.exportRecords({ fields: ['invalid'] }));
        expect(result._tag).toBe('Failure');
      });
    });

    describe('importRecords', () => {
      it('should import records successfully', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: { count: 2 } },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const records = [
          { record_id: '1', name: 'Alice' },
          { record_id: '2', name: 'Bob' },
        ];

        const result = await Effect.runPromise(client.importRecords(records));
        expect(result.count).toBe(2);
      });

      it('should import with overwrite behavior', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: { count: 1 } },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        await Effect.runPromise(
          client.importRecords([{ record_id: '1' }], { overwriteBehavior: 'overwrite' })
        );

        const lastCall = mockFetch.mock.calls[1];
        const body = lastCall[1]?.body as string;
        expect(body).toContain('overwriteBehavior=overwrite');
      });
    });

    describe('getExportFieldNames', () => {
      it('returns the export field names', async () => {
        const fieldNames = [
          { original_field_name: 'age', export_field_name: 'age' },
          { original_field_name: 'sex', export_field_name: 'sex' },
        ];
        const mockFetch = createMockFetch([{ ok: true, body: fieldNames }]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromise(client.getExportFieldNames());
        expect(result).toHaveLength(2);
        expect(result[0]?.export_field_name).toBe('age');
      });
    });

    describe('getSurveyLink', () => {
      it('returns the survey link as plain text', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: 'https://redcap.example.org/surveys/?s=ABC123', isText: true },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const link = await Effect.runPromise(
          client.getSurveyLink('REC-1' as never, 'survey1' as never)
        );
        expect(link).toContain('redcap.example.org');
      });
    });

    describe('downloadPdf', () => {
      it('returns the pdf as ArrayBuffer', async () => {
        const buf = new TextEncoder().encode('%PDF-...').buffer;
        const mockFetch = createMockFetch([{ ok: true, body: buf }]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const pdf = await Effect.runPromise(
          client.downloadPdf('REC-1' as never, 'survey1' as never)
        );
        expect(pdf).toBeInstanceOf(ArrayBuffer);
      });
    });

    describe('exportFile', () => {
      it('returns the file content as ArrayBuffer', async () => {
        const buf = new TextEncoder().encode('binary-content').buffer;
        const mockFetch = createMockFetch([{ ok: true, body: buf }]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const file = await Effect.runPromise(client.exportFile('attachment', 'REC-1'));
        expect(file).toBeInstanceOf(ArrayBuffer);
      });
    });

    describe('importFile', () => {
      it('uploads the file and resolves successfully', async () => {
        const mockFetch = createMockFetch([{ ok: true, body: '' }]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        await Effect.runPromise(
          client.importFile('attachment', 'REC-1', 'file.bin', new Uint8Array([1, 2, 3]))
        );

        const lastCall = mockFetch.mock.calls.at(-1)!;
        // crf-client appends a trailing slash if missing (REDCap quirk)
        expect(lastCall[0]).toBe(`${VALID_URL}/`);
        expect(lastCall[1]?.method).toBe('POST');
        expect(lastCall[1]?.body).toBeInstanceOf(FormData);
      });

      it('fails on HTTP error', async () => {
        const mockFetch = createMockFetch([{ ok: false, status: 500, body: 'boom', isText: true }]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const exit = await Effect.runPromiseExit(
          client.importFile('attachment', 'REC-1', 'file.bin', new Uint8Array([1]))
        );
        expect(exit._tag).toBe('Failure');
      });
    });

    describe('findUserIdByEmail', () => {
      it('should find user by email', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: [{ userid: 'john_doe' }] },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromise(client.findUserIdByEmail('john@example.com'));
        expect(result).toBe('john_doe');
      });

      it('should return null when user not found', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: [] },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromise(client.findUserIdByEmail('unknown@example.com'));
        expect(result).toBeNull();
      });

      it('should escape special characters in email', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: [] },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        await Effect.runPromise(client.findUserIdByEmail('test"injection@example.com'));

        const lastCall = mockFetch.mock.calls[1];
        const body = lastCall[1]?.body as string;
        // Should contain escaped quote
        expect(body).toContain('%5C%22'); // URL encoded \"
      });
    });

    describe('Error Handling', () => {
      it('should handle HTTP 401 Unauthorized', async () => {
        const mockFetch = createMockFetch([
          { ok: false, status: 401, body: 'Unauthorized', isText: true },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromiseExit(client.getVersion());
        expect(result._tag).toBe('Failure');
      });

      it('should handle HTTP 500 Server Error', async () => {
        const mockFetch = createMockFetch([
          { ok: false, status: 500, body: 'Internal Server Error', isText: true },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromiseExit(client.getVersion());
        expect(result._tag).toBe('Failure');
      });

      it('should handle network errors', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromiseExit(client.getVersion());
        expect(result._tag).toBe('Failure');
      });

      it('should handle REDCap API error response', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: { error: 'The API token is not valid' } },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromiseExit(client.getInstruments());
        expect(result._tag).toBe('Failure');
      });

      it('should handle unsupported version', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"13.0.0"', isText: true }, // Unsupported version
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        // getProjectInfo triggers version detection
        const result = await Effect.runPromiseExit(client.getProjectInfo());
        expect(result._tag).toBe('Failure');
      });

      it('should handle invalid version format', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"invalid"', isText: true }, // Invalid version
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const result = await Effect.runPromiseExit(client.getProjectInfo());
        expect(result._tag).toBe('Failure');
      });
    });

    describe('Version-specific Behavior', () => {
      it('should use v14 adapter for 14.x versions', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"14.5.10"', isText: true },
          { ok: true, body: { project_id: 1, project_title: 'Test' } },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const info = await Effect.runPromise(client.getProjectInfo());
        expect(info.project_id).toBe(1);
      });

      it('should use v15 adapter for 15.x versions', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"15.5.32"', isText: true },
          { ok: true, body: { project_id: 2, project_title: 'Test v15' } },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const info = await Effect.runPromise(client.getProjectInfo());
        expect(info.project_id).toBe(2);
      });

      it('should use v16 adapter for 16.x and above', async () => {
        const mockFetch = createMockFetch([
          { ok: true, body: '"16.0.8"', isText: true },
          { ok: true, body: { project_id: 3, project_title: 'Test v16' } },
        ]);

        const client = createCrfClient(
          { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
          mockFetch
        );

        const info = await Effect.runPromise(client.getProjectInfo());
        expect(info.project_id).toBe(3);
      });
    });
  });

  describe('makeCrfClientLayer', () => {
    it('provides a CrfClientService that proxies to the underlying client', async () => {
      const mockFetch = createMockFetch([{ ok: true, body: '"15.0.0"', isText: true }]);
      const layer = makeCrfClientLayer(
        { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
        mockFetch
      );

      const program = Effect.gen(function* () {
        const service = yield* CrfClientService;
        return yield* service.getVersion();
      });

      const version = await Effect.runPromise(Effect.provide(program, layer));
      expect(version).toBe('15.0.0');
    });
  });

  describe('Adapter feature flags', () => {
    it.each(['15.5.32', '16.0.8'])('exposes getFeatures for version %s', async (versionStr) => {
      const mockFetch = createMockFetch([
        { ok: true, body: `"${versionStr}"`, isText: true },
        { ok: true, body: { project_id: 1, project_title: 'Test' } },
      ]);

      const client = createCrfClient(
        { url: CrfUrl(VALID_URL), token: CrfToken(VALID_TOKEN) },
        mockFetch
      );

      await Effect.runPromise(client.getProjectInfo());
      // Trigger getFeatures via adapter access - re-import is fine because adapter cached
      const adapters = await import('./adapters/index.js');
      const adapter = await Effect.runPromise(
        adapters.getAdapterEffect({
          major: Number.parseInt(versionStr.split('.')[0]!, 10),
          minor: 0,
          patch: 0,
        })
      );
      const features = adapter.getFeatures();
      expect(features.repeatingInstruments).toBe(true);
      expect(features.alerts).toBe(true);
    });
  });

  // Skip le describe entier au lieu de skipper test par test : les
  // tests d'intégration Prism requièrent un serveur local non disponible
  // en CI. `describe.skip` est l'équivalent canonique vitest de `it.skip`.
  // eslint-disable-next-line vitest/no-disabled-tests -- nécessite serveur Prism local, à activer manuellement quand `pnpm --filter=@univ-lehavre/atlas-prism start` tourne
  describe.skip('Integration Tests (requires Prism running)', () => {
    const PRISM_URL = 'http://localhost:8080/api';

    const client = createCrfClient({
      url: CrfUrl(PRISM_URL),
      token: CrfToken(VALID_TOKEN),
    });

    it('should get version', async () => {
      const version = await Effect.runPromise(client.getVersion());
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });

    it('should get project info', async () => {
      const info = await Effect.runPromise(client.getProjectInfo());
      expect(info).toBeDefined();
      expect(info.project_id).toBeDefined();
    });

    it('should get instruments', async () => {
      const instruments = await Effect.runPromise(client.getInstruments());
      expect(instruments).toBeDefined();
      expect(Array.isArray(instruments)).toBe(true);
    });
  });
});
