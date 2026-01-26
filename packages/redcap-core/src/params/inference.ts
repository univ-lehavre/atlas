/**
 * Parameter type inference
 *
 * Infers parameter types from naming conventions.
 */

/** Parameter types */
export type ParameterType = 'string' | 'integer' | 'boolean' | 'array' | 'object';

/** Parameters that are arrays */
const ARRAY_PARAMS: readonly string[] = [
  'records',
  'fields',
  'forms',
  'events',
  'arms',
  'dags',
  'users',
  'roles',
];

/** Parameters that are booleans */
const BOOLEAN_PARAMS: readonly string[] = [
  'exportSurveyFields',
  'exportDataAccessGroups',
  'exportCheckboxLabel',
  'forceAutoNumber',
  'rawOrLabel',
  'rawOrLabelHeaders',
  'backgroundProcess',
  'allRecords',
  'compactDisplay',
  'exportBlankForGrayFormStatus',
  'override',
  'returnMetadataOnly',
  'csvDelimiter',
  'decimalCharacter',
];

/** Parameters that are integers */
const INTEGER_PARAMS: readonly string[] = [
  'report_id',
  'arm',
  'repeat_instance',
  'doc_id',
  'folder_id',
  'dag_id',
  'role_id',
  'event_id',
];

/**
 * Infer parameter type from name
 *
 * @example
 * ```ts
 * inferParamType('records') // 'array'
 * inferParamType('exportSurveyFields') // 'boolean'
 * inferParamType('report_id') // 'integer'
 * inferParamType('token') // 'string'
 * ```
 */
export const inferParamType = (paramName: string): ParameterType => {
  if (ARRAY_PARAMS.includes(paramName)) {
    return 'array';
  }
  if (BOOLEAN_PARAMS.includes(paramName)) {
    return 'boolean';
  }
  if (INTEGER_PARAMS.includes(paramName)) {
    return 'integer';
  }
  return 'string';
};

/** Field types for schema inference */
export type InferredFieldType = 'string' | 'integer' | 'boolean' | 'number';

/** Fields that are integers */
const INTEGER_FIELDS: readonly string[] = [
  'project_id',
  'event_id',
  'arm_num',
  'dag_id',
  'role_id',
  'user_id',
  'record_count',
  'field_count',
  'form_count',
];

/** Fields that are booleans */
const BOOLEAN_FIELDS: readonly string[] = [
  'is_longitudinal',
  'has_repeating_instruments',
  'surveys_enabled',
  'record_autonumbering_enabled',
  'secondary_unique_field_enabled',
  'data_entry_trigger_enabled',
  'custom_record_label_enabled',
  'scheduling_enabled',
  'randomization_enabled',
  'dde_enabled',
];

/**
 * Infer field type from name
 *
 * @example
 * ```ts
 * inferInferredFieldType('project_id') // 'integer'
 * inferInferredFieldType('is_longitudinal') // 'boolean'
 * inferInferredFieldType('project_title') // 'string'
 * ```
 */
export const inferInferredFieldType = (fieldName: string): InferredFieldType => {
  if (INTEGER_FIELDS.includes(fieldName)) {
    return 'integer';
  }
  if (BOOLEAN_FIELDS.includes(fieldName)) {
    return 'boolean';
  }
  return 'string';
};
