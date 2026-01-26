/**
 * REDCap API endpoints by version
 *
 * Lists of available content types for each REDCap version.
 */

import type { Version } from '../version/types.js';
import { isVersionAtLeast, createVersion } from '../version/compare.js';

/** API action types */
export type ApiAction =
  | 'export'
  | 'import'
  | 'delete'
  | 'switch'
  | 'list'
  | 'createFolder'
  | 'rename'
  | 'display';

/** Content types available in all supported versions */
export const CORE_CONTENT_TYPES: readonly string[] = [
  'record',
  'metadata',
  'file',
  'fileRepository',
  'instrument',
  'pdf',
  'event',
  'arm',
  'user',
  'project',
  'version',
  'surveyLink',
  'surveyQueueLink',
  'surveyReturnCode',
  'participantList',
  'exportFieldNames',
  'formEventMapping',
  'repeatingFormsEvents',
  'report',
  'dag',
  'userRole',
  'userRoleMapping',
  'userDagMapping',
  'log',
  'generateNextRecordName',
] as const;

/** Content types added in v15+ */
export const V15_CONTENT_TYPES: readonly string[] = [
  'project_settings',
  'fieldValidation',
] as const;

/** Content types added in v16+ */
export const V16_CONTENT_TYPES: readonly string[] = [
  'filesize',
  'fileinfo',
  'project_xml',
] as const;

/** Get all available content types for a version */
export const getContentTypesForVersion = (version: Version): readonly string[] => {
  const types = [...CORE_CONTENT_TYPES];

  if (isVersionAtLeast(version, createVersion(15, 0, 0))) {
    types.push(...V15_CONTENT_TYPES);
  }

  if (isVersionAtLeast(version, createVersion(16, 0, 0))) {
    types.push(...V16_CONTENT_TYPES);
  }

  return types;
};

/** Check if a content type is available for a version */
export const isContentTypeAvailable = (contentType: string, version: Version): boolean =>
  getContentTypesForVersion(version).includes(contentType);

/** Content type to supported actions mapping */
export const CONTENT_TYPE_ACTIONS: Readonly<Record<string, readonly ApiAction[]>> = {
  record: ['export', 'import', 'delete', 'rename'],
  metadata: ['export', 'import'],
  file: ['export', 'import', 'delete'],
  fileRepository: ['export', 'import', 'delete', 'list', 'createFolder'],
  instrument: ['export'],
  pdf: ['export'],
  event: ['export', 'import', 'delete'],
  arm: ['export', 'import', 'delete'],
  user: ['export', 'import', 'delete'],
  project: ['export', 'import'],
  project_settings: ['export', 'import'],
  project_xml: ['export'],
  version: ['export'],
  surveyLink: ['export'],
  surveyQueueLink: ['export'],
  surveyReturnCode: ['export'],
  participantList: ['export'],
  exportFieldNames: ['export'],
  formEventMapping: ['export', 'import'],
  repeatingFormsEvents: ['export', 'import'],
  report: ['export'],
  dag: ['export', 'import', 'delete', 'switch'],
  userRole: ['export', 'import', 'delete'],
  userRoleMapping: ['export', 'import'],
  userDagMapping: ['export', 'import'],
  log: ['export'],
  generateNextRecordName: ['export'],
  fieldValidation: ['export'],
  filesize: ['export'],
  fileinfo: ['export'],
} as const;

/** Get available actions for a content type */
export const getActionsForContentType = (contentType: string): readonly ApiAction[] =>
  CONTENT_TYPE_ACTIONS[contentType] ?? ['export'];

/** Check if an action is available for a content type */
export const isActionAvailable = (contentType: string, action: ApiAction): boolean =>
  getActionsForContentType(contentType).includes(action);
