/**
 * @module client
 * @description REDCap API client implementation using Effect.
 */
import { Effect, pipe, Context, Layer, Schedule } from 'effect';
import { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';
import type { RecordId, InstrumentName } from './brands.js';
import type {
  RedcapConfig,
  RedcapClient,
  ProjectInfo,
  Instrument,
  Field,
  ExportFieldName,
  ImportResult,
  ExportRecordsOptions,
  ImportRecordsOptions,
} from './types.js';

/**
 * Escapes special characters in a value to be used in REDCap filterLogic.
 * Prevents injection attacks by escaping double quotes and backslashes.
 */
export const escapeFilterLogicValue = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`);

/**
 * Effect Context Tag for the REDCap Client Service.
 */
export class RedcapClientService extends Context.Tag('RedcapClientService')<
  RedcapClientService,
  RedcapClient
>() {}

const buildParams = (
  config: RedcapConfig,
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
  config: RedcapConfig,
  params: Record<string, string>,
  fetchFn: typeof fetch
): Effect.Effect<Response, RedcapNetworkError> =>
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
      catch: (cause) => new RedcapNetworkError({ cause }),
    }),
    Effect.retry(retrySchedule)
  );

const checkResponseStatus = (
  response: Response
): Effect.Effect<Response, RedcapHttpError | RedcapNetworkError> =>
  response.ok
    ? Effect.succeed(response)
    : pipe(
        Effect.tryPromise({
          try: () => response.text(),
          catch: (cause) => new RedcapNetworkError({ cause }),
        }),
        Effect.flatMap((errorText) =>
          Effect.fail(new RedcapHttpError({ status: response.status, message: errorText }))
        )
      );

const isRedcapErrorResponse = (data: unknown): data is { readonly error: string } =>
  data !== null &&
  typeof data === 'object' &&
  'error' in data &&
  !Array.isArray(data) &&
  typeof (data as { error: string }).error === 'string';

const parseJsonResponse = <T>(
  response: Response
): Effect.Effect<T, RedcapApiError | RedcapNetworkError> =>
  pipe(
    Effect.tryPromise({
      try: (): Promise<unknown> => response.json(),
      catch: (cause) => new RedcapNetworkError({ cause }),
    }),
    Effect.flatMap((data) =>
      isRedcapErrorResponse(data)
        ? Effect.fail(new RedcapApiError({ message: data.error }))
        : Effect.succeed(data as T)
    )
  );

const fetchJSON = <T>(
  config: RedcapConfig,
  params: Record<string, string>,
  fetchFn: typeof fetch
): Effect.Effect<T, RedcapHttpError | RedcapApiError | RedcapNetworkError> =>
  pipe(
    makeRequest(config, params, fetchFn),
    Effect.flatMap(checkResponseStatus),
    Effect.flatMap(parseJsonResponse<T>)
  );

const fetchText = (
  config: RedcapConfig,
  params: Record<string, string>,
  fetchFn: typeof fetch
): Effect.Effect<string, RedcapHttpError | RedcapNetworkError> =>
  pipe(
    makeRequest(config, params, fetchFn),
    Effect.flatMap(checkResponseStatus),
    Effect.flatMap((response) =>
      Effect.tryPromise({
        try: () => response.text(),
        catch: (cause) => new RedcapNetworkError({ cause }),
      })
    )
  );

const fetchBuffer = (
  config: RedcapConfig,
  params: Record<string, string>,
  fetchFn: typeof fetch
): Effect.Effect<ArrayBuffer, RedcapHttpError | RedcapNetworkError> =>
  pipe(
    makeRequest(config, params, fetchFn),
    Effect.flatMap(checkResponseStatus),
    Effect.flatMap((response) =>
      Effect.tryPromise({
        try: () => response.arrayBuffer(),
        catch: (cause) => new RedcapNetworkError({ cause }),
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

const makeRedcapClient = (config: RedcapConfig, fetchFn: typeof fetch = fetch): RedcapClient => ({
  getVersion: () =>
    pipe(
      fetchText(config, { content: 'version', format: 'json' }, fetchFn),
      Effect.map((version) => version.replaceAll('"', ''))
    ),

  getProjectInfo: () =>
    fetchJSON<ProjectInfo>(config, { content: 'project', format: 'json' }, fetchFn),

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
    fetchJSON<readonly T[]>(config, buildExportParams(options), fetchFn),

  importRecords: (
    records: readonly Record<string, unknown>[],
    options: ImportRecordsOptions = {}
  ) => fetchJSON<ImportResult>(config, buildImportParams(records, options), fetchFn),

  getSurveyLink: (record: RecordId, instrument: InstrumentName) =>
    fetchText(config, { content: 'surveyLink', instrument, record }, fetchFn),

  downloadPdf: (recordId: RecordId, instrument: InstrumentName) =>
    fetchBuffer(
      config,
      { content: 'pdf', record: recordId, instrument, returnFormat: 'json' },
      fetchFn
    ),

  findUserIdByEmail: (email: string) =>
    pipe(
      fetchJSON<readonly { readonly userid?: string }[]>(
        config,
        buildExportParams({
          fields: ['userid'],
          filterLogic: `[email] = "${escapeFilterLogicValue(email)}"`,
          type: 'flat',
        }),
        fetchFn
      ),
      Effect.map(extractUserId)
    ),
});

/**
 * Creates an Effect Layer providing the RedcapClientService.
 */
export const makeRedcapClientLayer = (
  config: RedcapConfig,
  fetchFn: typeof fetch = fetch
): Layer.Layer<RedcapClientService> =>
  Layer.succeed(RedcapClientService, makeRedcapClient(config, fetchFn));

/**
 * Creates a new REDCap API client instance.
 */
export const createRedcapClient = (
  config: RedcapConfig,
  fetchFn: typeof fetch = fetch
): RedcapClient => makeRedcapClient(config, fetchFn);
