/**
 * @module client
 * @description REDCap API client implementation using Effect.
 *
 * This module provides the main client implementation for interacting with
 * REDCap's REST API. It uses Effect for functional error handling and
 * supports dependency injection through Effect's Layer system.
 *
 * @example
 * ```typescript
 * import { Effect } from 'effect';
 * import {
 *   createRedcapClient,
 *   RedcapUrl,
 *   RedcapToken
 * } from '@univ-lehavre/atlas-redcap-api';
 *
 * const client = createRedcapClient({
 *   url: RedcapUrl('https://redcap.example.com/api/'),
 *   token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
 * });
 *
 * // Use the client
 * const program = Effect.gen(function* () {
 *   const version = yield* client.getVersion();
 *   const records = yield* client.exportRecords();
 *   return { version, records };
 * });
 *
 * Effect.runPromise(program).then(console.log);
 * ```
 */
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
 *
 * Prevents injection attacks by escaping double quotes and backslashes.
 * Always use this function when incorporating user input into filterLogic expressions.
 *
 * @param value - The string value to escape
 * @returns The escaped string safe for use in filterLogic
 *
 * @example
 * ```typescript
 * import { escapeFilterLogicValue } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Safe usage with user input
 * const userEmail = 'john"injection@example.com';
 * const filterLogic = `[email] = "${escapeFilterLogicValue(userEmail)}"`;
 * // Result: [email] = "john\"injection@example.com"
 *
 * // Without escaping (UNSAFE - don't do this!)
 * const unsafeFilter = `[email] = "${userEmail}"`;
 * // Could allow injection attacks
 * ```
 *
 * @see {@link RedcapClient.findUserIdByEmail} - Uses this function internally
 */
export const escapeFilterLogicValue = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`);

/**
 * Effect Context Tag for the REDCap Client Service.
 *
 * Use this tag for dependency injection with Effect's Layer system.
 * This allows you to provide mock implementations for testing or
 * swap implementations at runtime.
 *
 * @example
 * ```typescript
 * import { Effect, Layer } from 'effect';
 * import {
 *   RedcapClientService,
 *   makeRedcapClientLayer,
 *   RedcapUrl,
 *   RedcapToken
 * } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Create a layer with real configuration
 * const RedcapLayer = makeRedcapClientLayer({
 *   url: RedcapUrl('https://redcap.example.com/api/'),
 *   token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
 * });
 *
 * // Use the service in your program
 * const program = Effect.gen(function* () {
 *   const client = yield* RedcapClientService;
 *   return yield* client.getVersion();
 * });
 *
 * // Provide the layer and run
 * Effect.runPromise(program.pipe(Effect.provide(RedcapLayer)));
 * ```
 *
 * @see {@link makeRedcapClientLayer} - Create a Layer providing this service
 */
export class RedcapClientService extends Context.Tag('RedcapClientService')<
  RedcapClientService,
  RedcapClient
>() {}

/**
 * Builds request parameters by merging provided params with the authentication token.
 *
 * @internal
 * @param config - The REDCap configuration containing the token
 * @param params - Additional parameters to merge with the token
 * @returns A record containing all parameters including the authentication token
 */
const buildParams = (
  config: RedcapConfig,
  params: Record<string, string>
): Record<string, string> => ({
  ...params,
  token: config.token,
});

/**
 * Makes a raw HTTP POST request to the REDCap API.
 *
 * All REDCap API calls use POST with URL-encoded form data.
 * This function wraps the fetch call in an Effect for error handling.
 *
 * @internal
 * @param config - The REDCap configuration (URL and token)
 * @param params - The request parameters (will be URL-encoded)
 * @param fetchFn - The fetch function to use (allows injection for testing)
 * @returns An Effect that resolves to the raw Response object
 * @throws {RedcapNetworkError} When the fetch call fails (network issues, DNS, etc.)
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
 * Checks the HTTP response status and extracts error information for non-2xx responses.
 *
 * @internal
 * @param response - The HTTP response to check
 * @returns An Effect that succeeds with the response if OK, or fails with an error
 * @throws {RedcapHttpError} When the response status is not 2xx
 * @throws {RedcapNetworkError} When reading the error body fails
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
 * Type guard to check if data is a REDCap error response.
 *
 * REDCap returns errors with 200 OK status but an error object in the body:
 * `{ "error": "Error message" }`
 *
 * @internal
 * @param data - The parsed JSON data to check
 * @returns True if data matches the REDCap error response shape
 */
const isRedcapErrorResponse = (data: unknown): data is { readonly error: string } =>
  data !== null &&
  typeof data === 'object' &&
  'error' in data &&
  !Array.isArray(data) &&
  typeof (data as { error: string }).error === 'string';

/**
 * Parses a JSON response and checks for REDCap API-level errors.
 *
 * REDCap may return a 200 OK status with an error in the JSON body.
 * This function detects those cases and converts them to proper errors.
 *
 * @internal
 * @typeParam T - The expected type of the successful response
 * @param response - The HTTP response to parse
 * @returns An Effect that succeeds with parsed data or fails with an error
 * @throws {RedcapApiError} When REDCap returns an error in the response body
 * @throws {RedcapNetworkError} When JSON parsing fails
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
 * Fetches JSON data from the REDCap API.
 *
 * Combines request, status check, and JSON parsing into a single operation.
 *
 * @internal
 * @typeParam T - The expected type of the response data
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
 * Fetches text data from the REDCap API.
 *
 * Used for endpoints that return plain text (e.g., version, survey links).
 *
 * @internal
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
 * Fetches binary data from the REDCap API.
 *
 * Used for endpoints that return binary content (e.g., PDF downloads).
 *
 * @internal
 * @param config - The REDCap configuration
 * @param params - The request parameters
 * @param fetchFn - The fetch function to use
 * @returns An Effect that resolves to the binary data as ArrayBuffer
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
 * Builds API parameters for record export requests.
 *
 * Converts the typed ExportRecordsOptions into the flat parameter record
 * expected by the REDCap API.
 *
 * @internal
 * @param options - Export options (all optional)
 * @returns A record of API parameters for the export request
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
  ...(options.rawOrLabel === undefined ? {} : { rawOrLabel: options.rawOrLabel }),
});

/**
 * Builds API parameters for record import requests.
 *
 * Converts records and import options into the parameter record
 * expected by the REDCap API. Records are JSON-serialized in the 'data' parameter.
 *
 * @internal
 * @param records - The records to import (will be JSON-serialized)
 * @param options - Import options (all optional)
 * @returns A record of API parameters for the import request
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
 * Extracts the user ID from a search results array.
 *
 * Used by findUserIdByEmail to extract the userid from the first matching record.
 *
 * @internal
 * @param results - The array of records returned by the search
 * @returns The user ID if found and non-empty, otherwise null
 */
const extractUserId = (results: readonly { readonly userid?: string }[]): string | null => {
  const firstResult = results[0];
  return results.length > 0 && firstResult?.userid !== undefined && firstResult.userid !== ''
    ? firstResult.userid
    : null;
};

/**
 * Creates a RedcapClient implementation with all API methods.
 *
 * This is the internal factory function used by both createRedcapClient
 * and makeRedcapClientLayer.
 *
 * @internal
 * @param config - The REDCap configuration containing URL and token
 * @param fetchFn - The fetch function to use (defaults to global fetch, injectable for testing)
 * @returns A fully configured RedcapClient instance
 */
const makeRedcapClient = (config: RedcapConfig, fetchFn: typeof fetch = fetch): RedcapClient => ({
  getVersion: () =>
    pipe(
      fetchText(config, { content: 'version', format: 'json' }, fetchFn),
      Effect.map((version) => version.replaceAll('"', ''))
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
 * Creates an Effect Layer providing the RedcapClientService.
 *
 * Use this when you want to integrate the REDCap client with Effect's
 * dependency injection system. The layer can be provided to programs
 * that depend on RedcapClientService.
 *
 * @param config - The REDCap configuration containing URL and token
 * @param fetchFn - Optional custom fetch function (defaults to global fetch)
 * @returns A Layer that provides RedcapClientService
 *
 * @example
 * ```typescript
 * import { Effect, Layer } from 'effect';
 * import {
 *   RedcapClientService,
 *   makeRedcapClientLayer,
 *   RedcapUrl,
 *   RedcapToken
 * } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Create the layer
 * const RedcapLayer = makeRedcapClientLayer({
 *   url: RedcapUrl('https://redcap.example.com/api/'),
 *   token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
 * });
 *
 * // Define a program using the service
 * const program = Effect.gen(function* () {
 *   const client = yield* RedcapClientService;
 *   const version = yield* client.getVersion();
 *   const info = yield* client.getProjectInfo();
 *   return { version, projectTitle: info.project_title };
 * });
 *
 * // Run with the layer
 * Effect.runPromise(program.pipe(Effect.provide(RedcapLayer)))
 *   .then(console.log);
 * ```
 *
 * @see {@link RedcapClientService} - The service tag to use in programs
 * @see {@link createRedcapClient} - Direct client creation without Effect Layer
 */
export const makeRedcapClientLayer = (
  config: RedcapConfig,
  fetchFn: typeof fetch = fetch
): Layer.Layer<RedcapClientService> =>
  Layer.succeed(RedcapClientService, makeRedcapClient(config, fetchFn));

/**
 * Creates a new REDCap API client instance.
 *
 * This is the main entry point for using the REDCap API. The returned client
 * provides methods for all supported API operations, each returning an Effect
 * for functional error handling.
 *
 * @param config - The REDCap configuration containing URL and token
 * @param fetchFn - Optional custom fetch function (useful for testing or custom HTTP handling)
 * @returns A fully configured RedcapClient instance
 *
 * @example
 * ```typescript
 * import { Effect, pipe } from 'effect';
 * import {
 *   createRedcapClient,
 *   RedcapUrl,
 *   RedcapToken,
 *   RecordId,
 *   InstrumentName
 * } from '@univ-lehavre/atlas-redcap-api';
 *
 * // Create client with validated credentials
 * const client = createRedcapClient({
 *   url: RedcapUrl('https://redcap.example.com/api/'),
 *   token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
 * });
 *
 * // Basic usage - get project info
 * const getInfo = async () => {
 *   const info = await Effect.runPromise(client.getProjectInfo());
 *   console.log(`Project: ${info.project_title}`);
 * };
 *
 * // Export records with filtering
 * interface Patient {
 *   record_id: string;
 *   first_name: string;
 *   age: number;
 * }
 *
 * const getAdultPatients = async () => {
 *   const patients = await Effect.runPromise(
 *     client.exportRecords<Patient>({
 *       fields: ['record_id', 'first_name', 'age'],
 *       filterLogic: '[age] >= 18',
 *     })
 *   );
 *   return patients;
 * };
 *
 * // Error handling with Effect
 * const safeGetVersion = pipe(
 *   client.getVersion(),
 *   Effect.catchTag('RedcapHttpError', (e) =>
 *     Effect.succeed(`HTTP Error: ${e.status}`)
 *   ),
 *   Effect.catchTag('RedcapNetworkError', () =>
 *     Effect.succeed('Network unavailable')
 *   )
 * );
 * ```
 *
 * @see {@link makeRedcapClientLayer} - For Effect-based dependency injection
 * @see {@link RedcapClient} - The interface describing available methods
 */
export const createRedcapClient = (
  config: RedcapConfig,
  fetchFn: typeof fetch = fetch
): RedcapClient => makeRedcapClient(config, fetchFn);
