/**
 * REDCap type definitions
 */

export type {
  RedcapConfig,
  ExportRecordsOptions,
  ImportRecordsOptions,
  ExportFileOptions,
  ImportFileOptions,
} from './config.js';

export type {
  ProjectInfo,
  Field,
  FieldType,
  Instrument,
  Event,
  Arm,
  User,
  FormPermission,
  FormExportPermission,
  DataAccessGroup,
  UserRole,
  RepeatingFormsEvents,
  FormEventMapping,
  ExportFieldName,
  ImportResult,
  LogEntry,
} from './domain.js';

export {
  type ErrorResponse,
  isErrorResponse,
  type VersionResponse,
  type CountResponse,
  type IdsResponse,
  type AutoIdsResponse,
  type FileInfoResponse,
  type SurveyLinkResponse,
  type SurveyQueueLinkResponse,
  type SurveyReturnCodeResponse,
  type NextRecordNameResponse,
} from './responses.js';
