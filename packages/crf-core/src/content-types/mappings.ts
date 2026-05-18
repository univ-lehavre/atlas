/**
 * REDCap content type mappings
 *
 * Maps internal PHP keys to API content types.
 */

/** Map PHP help.php keys to API content type names */
export const CONTENT_KEY_MAPPING: Readonly<Record<string, string>> = {
  records: 'record',
  metadata: 'metadata',
  file: 'file',
  file_repo: 'fileRepository',
  list_file_repo: 'fileRepository',
  instr: 'instrument',
  instr_pdf: 'pdf',
  surv_link: 'surveyLink',
  surv_queue_link: 'surveyQueueLink',
  surv_ret_code: 'surveyReturnCode',
  surv_parts: 'participantList',
  events: 'event',
  arms: 'arm',
  dags: 'dag',
  user_dag_maps: 'userDagMapping',
  users: 'user',
  user_roles: 'userRole',
  user_role_maps: 'userRoleMapping',
  field_names: 'exportFieldNames',
  inst_event_maps: 'formEventMapping',
  reports: 'report',
  project: 'project',
  project_settings: 'project_settings',
  repeating_forms_events: 'repeatingFormsEvents',
  logging: 'log',
  version: 'version',
} as const;

/** Map content key to normalized content type */
export const mapContentKeyToType = (key: string): string => CONTENT_KEY_MAPPING[key] ?? key;

/** OpenAPI tag groups for organizing endpoints */
export const TAG_GROUPS: Readonly<Record<string, readonly string[]>> = {
  Records: ['record'],
  Metadata: ['metadata', 'exportFieldNames', 'fieldValidation'],
  Files: ['file', 'fileRepository'],
  Instruments: ['instrument', 'pdf', 'formEventMapping', 'repeatingFormsEvents'],
  Surveys: ['surveyLink', 'surveyQueueLink', 'surveyReturnCode', 'participantList'],
  'Project Structure': ['event', 'arm', 'project', 'project_settings', 'project_xml'],
  'Users & Permissions': ['user', 'userRole', 'userRoleMapping', 'dag', 'userDagMapping'],
  Reports: ['report', 'log'],
  Other: [
    'version',
    'generateNextRecordName',
    'authkey',
    'appRightsCheck',
    'attachment',
    'tableau',
    'mycap',
  ],
} as const;

/** Get the tag group for a content type */
export const getTagGroup = (contentType: string): string => {
  for (const [group, types] of Object.entries(TAG_GROUPS)) {
    if (types.includes(contentType)) {
      return group;
    }
  }
  return 'Other';
};

/** Get all content types in a tag group */
export const getContentTypesInGroup = (group: string): readonly string[] => TAG_GROUPS[group] ?? [];
