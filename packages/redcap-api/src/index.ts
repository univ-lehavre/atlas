// Client and service
export {
  createRedcapClient,
  escapeFilterLogicValue,
  makeRedcapClientLayer,
  RedcapClientService,
} from './client.js';
export type { RedcapClient, ExportRecordsOptions, ImportRecordsOptions } from './client.js';

// Errors
export { RedcapHttpError, RedcapApiError, RedcapNetworkError } from './errors.js';
export type { RedcapError } from './errors.js';

// Types
export type {
  RedcapConfig,
  RedcapExportParams,
  RedcapImportParams,
  Record,
  ImportResponse,
} from './types.js';
export { RecordSchema, ImportResponseSchema } from './types.js';
