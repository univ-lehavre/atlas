import { Effect, pipe, Context, Layer } from 'effect';
import { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';
import type { RecordId, InstrumentName } from './brands.js';
import type {
  RedcapConfig,
  RedcapClient,
  RedcapProjectInfo,
  RedcapInstrument,
  RedcapField,
  RedcapExportFieldName,
  ExportRecordsOptions,
  ImportRecordsOptions,
} from './types.js';

/**
 * Escapes special characters in a value to be used in REDCap filterLogic.
 * Prevents injection attacks by escaping double quotes and backslashes.
 * @param value - The string value to escape
 * @returns The escaped string safe for use in filterLogic
 */
export const escapeFilterLogicValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * REDCap Client Service Tag
 */
export class RedcapClientService extends Context.Tag('RedcapClientService')<
  RedcapClientService,
  RedcapClient
>() {}

/**
 * Build request params with token
 * @param config - The REDCap configuration
 * @param params - Additional parameters to merge
 * @returns The merged parameters with token
 */
const buildParams = (
  config: RedcapConfig,
  params: Record<string, string>
): Record<string, string> => ({
  ...params,
  token: config.token,
});

/**
 * Make a raw request to REDCap API
 * @param config - The REDCap configuration
 * @param params - The request parameters
 * @param fetchFn - The fetch function to use
 * @returns An Effect that resolves to the Response
 */
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
    })
  );

/**
 * Check response status and return error effect if not ok
 * @param response - The HTTP response to check
 * @returns An Effect that succeeds with the response or fails with an error
 */
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

/**
 * Type guard to check if data is a REDCap error response
 * @param data - The data to check
 * @returns True if data is a REDCap error response
 */
const isRedcapErrorResponse = (data: unknown): data is { readonly error: string } =>
  data !== null &&
  typeof data === 'object' &&
  'error' in data &&
  !Array.isArray(data) &&
  typeof (data as { error: string }).error === 'string';

/**
 * Parse JSON response and check for API-level errors
 * @param response - The HTTP response to parse
 * @returns An Effect that succeeds with the parsed data or fails with an error
 */
const parseJsonResponse = <T>(
  response: Response
): Effect.Effect<T, RedcapApiError | RedcapNetworkError> =>
  pipe(
    Effect.tryPromise({
      try: (): Promise<unknown> => response.json(),
      catch: (cause) => new RedcapNetworkError({ cause }),
    }),
    Effect.flatMap((data) =>
      // REDCap returns { error: "..." } for API-level errors even with 200 status
      isRedcapErrorResponse(data)
        ? Effect.fail(new RedcapApiError({ message: data.error }))
        : Effect.succeed(data as T)
    )
  );

/**
 * Fetch JSON from REDCap API
 * @param config - The REDCap configuration
 * @param params - The request parameters
 * @param fetchFn - The fetch function to use
 * @returns An Effect that resolves to the parsed JSON data
 */
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

/**
 * Fetch text from REDCap API
 * @param config - The REDCap configuration
 * @param params - The request parameters
 * @param fetchFn - The fetch function to use
 * @returns An Effect that resolves to the text response
 */
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

/**
 * Fetch binary data from REDCap API
 * @param config - The REDCap configuration
 * @param params - The request parameters
 * @param fetchFn - The fetch function to use
 * @returns An Effect that resolves to the binary data
 */
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

/**
 * Build export params from options
 * @param options - Export options
 * @returns The built parameters object
 */
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
  ...(options.rawOrLabel !== undefined ? { rawOrLabel: options.rawOrLabel } : {}),
});

/**
 * Build import params from options and records
 * @param records - The records to import
 * @param options - Import options
 * @returns The built parameters object
 */
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

/**
 * Extract user ID from results array
 * @param results - The results array from REDCap
 * @returns The user ID or null if not found
 */
const extractUserId = (results: readonly { readonly userid?: string }[]): string | null => {
  const firstResult = results[0];
  return results.length > 0 && firstResult?.userid !== undefined && firstResult.userid !== ''
    ? firstResult.userid
    : null;
};

/**
 * Creates a RedcapClient implementation
 * @param config - The REDCap configuration
 * @param fetchFn - The fetch function to use (defaults to global fetch)
 * @returns A RedcapClient instance
 */
const makeRedcapClient = (config: RedcapConfig, fetchFn: typeof fetch = fetch): RedcapClient => ({
  getVersion: () =>
    pipe(
      fetchText(config, { content: 'version', format: 'json' }, fetchFn),
      Effect.map((version) => version.replace(/"/g, ''))
    ),

  getProjectInfo: () =>
    fetchJSON<RedcapProjectInfo>(config, { content: 'project', format: 'json' }, fetchFn),

  getInstruments: () =>
    fetchJSON<readonly RedcapInstrument[]>(
      config,
      { content: 'instrument', format: 'json' },
      fetchFn
    ),

  getFields: () =>
    fetchJSON<readonly RedcapField[]>(config, { content: 'metadata', format: 'json' }, fetchFn),

  getExportFieldNames: () =>
    fetchJSON<readonly RedcapExportFieldName[]>(
      config,
      { content: 'exportFieldNames', format: 'json' },
      fetchFn
    ),

  exportRecords: <T>(options: ExportRecordsOptions = {}) =>
    fetchJSON<readonly T[]>(config, buildExportParams(options), fetchFn),

  importRecords: (
    records: readonly Record<string, unknown>[],
    options: ImportRecordsOptions = {}
  ) => fetchJSON<{ readonly count: number }>(config, buildImportParams(records, options), fetchFn),

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
 * Creates a Layer for the RedcapClient service
 * @param config - The REDCap configuration
 * @param fetchFn - The fetch function to use (defaults to global fetch)
 * @returns A Layer that provides the RedcapClientService
 */
export const makeRedcapClientLayer = (
  config: RedcapConfig,
  fetchFn: typeof fetch = fetch
): Layer.Layer<RedcapClientService> =>
  Layer.succeed(RedcapClientService, makeRedcapClient(config, fetchFn));

/**
 * Creates a new REDCap client instance
 * @param config - The REDCap configuration
 * @param fetchFn - The fetch function to use (defaults to global fetch)
 * @returns A RedcapClient instance
 */
export const createRedcapClient = (
  config: RedcapConfig,
  fetchFn: typeof fetch = fetch
): RedcapClient => makeRedcapClient(config, fetchFn);
