/**
 * @module client
 * @description REDCap API client implementation using Effect with version auto-detection.
 */
import { Effect, pipe, Context, Layer, Schedule } from 'effect';
import { CrfHttpError, CrfApiError, CrfNetworkError } from './errors.js';
import type { RecordId, InstrumentName } from './brands.js';
import type {
  CrfConfig,
  CrfClient,
  Instrument,
  Field,
  ExportFieldName,
  ImportResult,
  ExportRecordsOptions,
  ImportRecordsOptions,
} from './types.js';
import {
  parseVersion,
  type Version,
  type VersionParseError,
  type UnsupportedVersionError,
} from './version.js';
import { getAdapterEffect, type CrfAdapter } from './adapters/index.js';

/**
 * Escapes special characters in a value to be used in REDCap filterLogic.
 * Prevents injection attacks by escaping double quotes and backslashes.
 */
export const escapeFilterLogicValue = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`);

/**
 * Effect Context Tag for the REDCap Client Service.
 */
export class CrfClientService extends Context.Tag('CrfClientService')<
  CrfClientService,
  CrfClient
>() {}

/**
 * Internal state for version-aware client.
 */
interface ClientState {
  readonly version: Version | null;
  readonly adapter: CrfAdapter | null;
  readonly versionString: string | null;
}

const buildParams = (
  config: CrfConfig,
  params: Record<string, string>
): Record<string, string> => ({
  ...params,
  token: config.token,
});

const retrySchedule = pipe(
  Schedule.exponential('100 millis'),
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(3))
);

const makeRequest = (
  config: CrfConfig,
  params: Record<string, string>,
  fetchFn: typeof fetch
): Effect.Effect<Response, CrfNetworkError> =>
  pipe(
    Effect.tryPromise({
      try: () =>
        fetchFn(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: new URLSearchParams(buildParams(config, params)).toString(),
        }),
      catch: (cause) => new CrfNetworkError({ cause }),
    }),
    Effect.retry(retrySchedule)
  );

const checkResponseStatus = (
  response: Response
): Effect.Effect<Response, CrfHttpError | CrfNetworkError> =>
  response.ok
    ? Effect.succeed(response)
    : pipe(
        Effect.tryPromise({
          try: () => response.text(),
          catch: (cause) => new CrfNetworkError({ cause }),
        }),
        Effect.flatMap((body) =>
          Effect.fail(
            new CrfHttpError({
              status: response.status,
              statusText: response.statusText,
              body,
            })
          )
        )
      );

const isCrfErrorResponse = (data: unknown): data is { readonly error: string } =>
  data !== null &&
  typeof data === 'object' &&
  'error' in data &&
  !Array.isArray(data) &&
  typeof (data as { error: string }).error === 'string';

const parseJsonResponse = <T>(
  response: Response
): Effect.Effect<T, CrfApiError | CrfNetworkError> =>
  pipe(
    Effect.tryPromise({
      try: (): Promise<unknown> => response.json(),
      catch: (cause) => new CrfNetworkError({ cause }),
    }),
    Effect.flatMap((data) =>
      isCrfErrorResponse(data)
        ? Effect.fail(new CrfApiError({ error: data.error }))
        : Effect.succeed(data as T)
    )
  );

const fetchJSON = <T>(
  config: CrfConfig,
  params: Record<string, string>,
  fetchFn: typeof fetch
): Effect.Effect<T, CrfHttpError | CrfApiError | CrfNetworkError> =>
  pipe(
    makeRequest(config, params, fetchFn),
    Effect.flatMap(checkResponseStatus),
    Effect.flatMap(parseJsonResponse<T>)
  );

const fetchText = (
  config: CrfConfig,
  params: Record<string, string>,
  fetchFn: typeof fetch
): Effect.Effect<string, CrfHttpError | CrfNetworkError> =>
  pipe(
    makeRequest(config, params, fetchFn),
    Effect.flatMap(checkResponseStatus),
    Effect.flatMap((response) =>
      Effect.tryPromise({
        try: () => response.text(),
        catch: (cause) => new CrfNetworkError({ cause }),
      })
    )
  );

const fetchBuffer = (
  config: CrfConfig,
  params: Record<string, string>,
  fetchFn: typeof fetch
): Effect.Effect<ArrayBuffer, CrfHttpError | CrfNetworkError> =>
  pipe(
    makeRequest(config, params, fetchFn),
    Effect.flatMap(checkResponseStatus),
    Effect.flatMap((response) =>
      Effect.tryPromise({
        try: () => response.arrayBuffer(),
        catch: (cause) => new CrfNetworkError({ cause }),
      })
    )
  );

const buildExportParams = (options: ExportRecordsOptions = {}): Record<string, string> => ({
  content: 'record',
  action: 'export',
  format: 'json',
  type: options.type ?? 'flat',
  ...(options.fields !== undefined && options.fields.length > 0
    ? { fields: options.fields.join(',') }
    : {}),
  ...(options.forms !== undefined && options.forms.length > 0
    ? { forms: options.forms.join(',') }
    : {}),
  ...(options.filterLogic !== undefined && options.filterLogic !== ''
    ? { filterLogic: options.filterLogic }
    : {}),
  ...(options.rawOrLabel === undefined ? {} : { rawOrLabel: options.rawOrLabel }),
});

const buildImportParams = (
  records: readonly Record<string, unknown>[],
  options: ImportRecordsOptions = {}
): Record<string, string> => ({
  content: 'record',
  action: 'import',
  format: 'json',
  type: 'flat',
  overwriteBehavior: options.overwriteBehavior ?? 'normal',
  forceAutoNumber: 'false',
  data: JSON.stringify(records),
  returnContent: options.returnContent ?? 'count',
});

const extractUserId = (results: readonly { readonly userid?: string }[]): string | null => {
  const firstResult = results[0];
  return results.length > 0 && firstResult?.userid !== undefined && firstResult.userid !== ''
    ? firstResult.userid
    : null;
};

/**
 * Creates a version-aware REDCap client that auto-detects the server version.
 *
 * The client will:
 * 1. Detect the REDCap server version on first API call
 * 2. Select the appropriate adapter for that version
 * 3. Apply version-specific transformations to requests/responses
 */
const makeCrfClient = (rawConfig: CrfConfig, fetchFn: typeof fetch = fetch): CrfClient => {
  // REDCap returns HTTP 501 on POST when the API URL is missing the
  // trailing slash (e.g. `/api` instead of `/api/`). Normalise here so
  // callers don't have to remember this quirk.
  const config: CrfConfig = {
    ...rawConfig,
    url: (rawConfig.url.endsWith('/')
      ? rawConfig.url
      : `${rawConfig.url}/`) as typeof rawConfig.url,
  };
  // Mutable state for lazy initialization (caching detected version)
  // eslint-disable-next-line functional/no-let -- Required for lazy caching
  let state: ClientState = { version: null, adapter: null, versionString: null };

  /**
   * Fetch version from REDCap server.
   */
  const fetchVersion = (): Effect.Effect<string, CrfHttpError | CrfNetworkError> =>
    pipe(
      fetchText(config, { content: 'version', format: 'json' }, fetchFn),
      Effect.map((version) => version.replaceAll('"', '').trim())
    );

  /**
   * Ensure the client is initialized with version and adapter.
   * This is called lazily on first API call that needs version-specific behavior.
   */
  const ensureInitialized = (): Effect.Effect<
    CrfAdapter,
    CrfHttpError | CrfNetworkError | VersionParseError | UnsupportedVersionError
  > =>
    state.adapter === null
      ? pipe(
          fetchVersion(),
          Effect.flatMap((versionString) =>
            pipe(
              parseVersion(versionString),
              Effect.flatMap((version) =>
                pipe(
                  getAdapterEffect(version),
                  Effect.tap((adapter) =>
                    Effect.sync(() => {
                      // eslint-disable-next-line functional/no-expression-statements -- Cache update
                      state = { version, adapter, versionString };
                    })
                  )
                )
              )
            )
          )
        )
      : Effect.succeed(state.adapter);

  /**
   * Apply adapter transformation to export params.
   */
  const applyExportTransform = (
    params: Record<string, string>
  ): Effect.Effect<
    Record<string, string>,
    CrfHttpError | CrfNetworkError | VersionParseError | UnsupportedVersionError
  > =>
    pipe(
      ensureInitialized(),
      Effect.map((adapter) => ({
        ...adapter.getDefaultParams(),
        ...adapter.transformExportParams(params),
      }))
    );

  /**
   * Apply adapter transformation to import params.
   */
  const applyImportTransform = (
    params: Record<string, string>
  ): Effect.Effect<
    Record<string, string>,
    CrfHttpError | CrfNetworkError | VersionParseError | UnsupportedVersionError
  > =>
    pipe(
      ensureInitialized(),
      Effect.map((adapter) => ({
        ...adapter.getDefaultParams(),
        ...adapter.transformImportParams(params),
      }))
    );

  return {
    getVersion: () =>
      pipe(
        fetchVersion(),
        Effect.tap((versionString) =>
          state.versionString === null
            ? Effect.sync(() => {
                // eslint-disable-next-line functional/no-expression-statements -- Cache update
                state = { ...state, versionString };
              })
            : Effect.void
        )
      ),

    getProjectInfo: () =>
      pipe(
        ensureInitialized(),
        Effect.flatMap((adapter) =>
          pipe(
            fetchJSON<unknown>(config, { content: 'project', format: 'json' }, fetchFn),
            Effect.map((response) => adapter.parseProjectInfo(response))
          )
        )
      ),

    getInstruments: () =>
      fetchJSON<readonly Instrument[]>(config, { content: 'instrument', format: 'json' }, fetchFn),

    getFields: () =>
      fetchJSON<readonly Field[]>(config, { content: 'metadata', format: 'json' }, fetchFn),

    getExportFieldNames: () =>
      fetchJSON<readonly ExportFieldName[]>(
        config,
        { content: 'exportFieldNames', format: 'json' },
        fetchFn
      ),

    exportRecords: <T>(options: ExportRecordsOptions = {}) =>
      pipe(
        applyExportTransform(buildExportParams(options)),
        Effect.flatMap((params) => fetchJSON<readonly T[]>(config, params, fetchFn))
      ),

    importRecords: (
      records: readonly Record<string, unknown>[],
      options: ImportRecordsOptions = {}
    ) =>
      pipe(
        applyImportTransform(buildImportParams(records, options)),
        Effect.flatMap((params) => fetchJSON<ImportResult>(config, params, fetchFn))
      ),

    getSurveyLink: (record: RecordId, instrument: InstrumentName) =>
      fetchText(config, { content: 'surveyLink', instrument, record }, fetchFn),

    downloadPdf: (recordId: RecordId, instrument: InstrumentName) =>
      fetchBuffer(
        config,
        { content: 'pdf', record: recordId, instrument, returnFormat: 'json' },
        fetchFn
      ),

    exportFile: (field: string, recordId: string) =>
      fetchBuffer(
        config,
        { content: 'file', action: 'export', field, record: recordId, returnFormat: 'json' },
        fetchFn
      ),

    importFile: (field: string, recordId: string, fileName: string, content: Uint8Array) =>
      pipe(
        Effect.tryPromise({
          try: () => {
            const form = new FormData();
            form.append('token', config.token);
            form.append('content', 'file');
            form.append('action', 'import');
            form.append('field', field);
            form.append('record', recordId);
            form.append('returnFormat', 'json');
            form.append('file', new Blob([content.buffer as ArrayBuffer]), fileName);
            return fetchFn(config.url, { method: 'POST', body: form });
          },
          catch: (cause) => new CrfNetworkError({ cause }),
        }),
        Effect.flatMap(checkResponseStatus),
        Effect.asVoid
      ),

    findUserIdByEmail: (email: string) =>
      pipe(
        applyExportTransform(
          buildExportParams({
            fields: ['userid'],
            filterLogic: `[email] = "${escapeFilterLogicValue(email)}"`,
            type: 'flat',
          })
        ),
        Effect.flatMap((params) =>
          fetchJSON<readonly { readonly userid?: string }[]>(config, params, fetchFn)
        ),
        Effect.map(extractUserId)
      ),
  };
};

/**
 * Creates an Effect Layer providing the CrfClientService.
 */
export const makeCrfClientLayer = (
  config: CrfConfig,
  fetchFn: typeof fetch = fetch
): Layer.Layer<CrfClientService> => Layer.succeed(CrfClientService, makeCrfClient(config, fetchFn));

/**
 * Creates a new REDCap API client instance.
 *
 * The client automatically detects the REDCap server version and adapts
 * its requests accordingly. Version detection happens lazily on the first
 * API call that requires version-specific behavior.
 *
 * @param config - REDCap connection configuration
 * @param fetchFn - Optional custom fetch function (for testing)
 * @returns A version-aware REDCap client
 *
 * @example
 * ```typescript
 * import { Effect } from 'effect';
 * import { createCrfClient, CrfUrl, CrfToken } from '@univ-lehavre/crf/redcap';
 *
 * const client = createCrfClient({
 *   url: CrfUrl('https://redcap.example.com/api/'),
 *   token: CrfToken('AABBCCDD11223344AABBCCDD11223344'),
 * });
 *
 * // Version is auto-detected on first call
 * const records = await Effect.runPromise(client.exportRecords());
 * ```
 */
export const createCrfClient = (config: CrfConfig, fetchFn: typeof fetch = fetch): CrfClient =>
  makeCrfClient(config, fetchFn);
