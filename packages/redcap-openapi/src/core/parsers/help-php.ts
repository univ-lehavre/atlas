/**
 * Parser for REDCap API/help.php
 *
 * Pure function that extracts documentation and parameter information from PHP source.
 */

import type { HelpSection, Parameter, ParameterType } from '../types.js';

const CONTENT_KEY_MAPPING: Readonly<Record<string, string>> = {
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
};

const PERMISSION_MAPPING: Readonly<Record<string, string>> = {
  e: 'API Export',
  i: 'API Import/Update',
  d: 'Delete Record',
  l: 'API Export',
  iuser: 'User Rights',
  idesign: 'Project Design and Setup',
  iproj: 'Create Projects',
  dag_e: 'Data Access Groups Export',
  dag_i: 'Data Access Groups Import',
  design_e: 'Project Design Export',
  design_i: 'Project Design Import',
  euser: 'User Rights',
  rename: 'Rename Record',
};

const mapContentKeyToType = (key: string): string => CONTENT_KEY_MAPPING[key] ?? key;

const mapPermission = (perm: string): string => PERMISSION_MAPPING[perm] ?? perm;

const inferParamType = (paramName: string): ParameterType => {
  if (['records', 'fields', 'forms', 'events', 'arms', 'dags'].includes(paramName)) {
    return 'array';
  }

  if (
    [
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
    ].includes(paramName)
  ) {
    return 'boolean';
  }

  if (
    ['report_id', 'arm', 'repeat_instance', 'doc_id', 'folder_id', 'dag_id', 'role_id'].includes(
      paramName
    )
  ) {
    return 'integer';
  }

  return 'string';
};

const extractParamsFromSection = (section: string): Parameter[] => {
  const params: Parameter[] = [];
  const paramPattern = /RCView::span\s*\(\s*\$aci\s*,\s*['"](\w+)['"]\s*\)/g;

  let match;
  while ((match = paramPattern.exec(section)) !== null) {
    const paramName = match[1];
    if (!paramName) continue;

    if (params.some((p) => p.name === paramName)) continue;

    const param: Parameter = {
      name: paramName,
      type: inferParamType(paramName),
      description: `Parameter: ${paramName}`,
    };

    const enumMatch = section
      .slice(match.index, match.index + 500)
      .match(/RCView::li\s*\(\s*\$ae\s*,\s*['"]([^'"]+)['"]/g);

    if (enumMatch && enumMatch.length > 1) {
      const enumValues = enumMatch
        .map((e) => {
          const m = e.match(/['"]([^'"]+)['"]\s*\)$/);
          return m?.[1] ?? '';
        })
        .filter((v): v is string => Boolean(v));

      if (enumValues.length > 0) {
        param.enum = enumValues;
      }
    }

    params.push(param);
  }

  return params;
};

/**
 * Parse help.php content to extract documentation and parameters
 *
 * @param content - Raw PHP source code of help.php
 * @returns Map of endpoint key to help section
 */
export const parseHelpPhp = (content: string): Map<string, HelpSection> => {
  if (!content) {
    return new Map();
  }

  const sections = new Map<string, HelpSection>();

  const sectionPattern =
    /if\s*\(\s*\$content\s*==\s*['"](\w+)['"]\s*\)\s*\{([\s\S]*?)(?=\nif\s*\(\s*\$content|\n\/\/\s+\w|$)/g;

  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    const contentKey = match[1];
    const sectionContent = match[2];

    if (!contentKey || !sectionContent) continue;

    let action = 'export';
    let contentType = contentKey;

    if (contentKey.startsWith('exp_')) {
      action = 'export';
      contentType = mapContentKeyToType(contentKey.slice(4));
    } else if (contentKey.startsWith('imp_')) {
      action = 'import';
      contentType = mapContentKeyToType(contentKey.slice(4));
    } else if (contentKey.startsWith('del_')) {
      action = 'delete';
      contentType = mapContentKeyToType(contentKey.slice(4));
    } else if (contentKey === 'rename_record') {
      action = 'rename';
      contentType = 'record';
    } else if (contentKey === 'switch_dag') {
      action = 'switch';
      contentType = 'dag';
    } else if (contentKey === 'create_folder_file_repo') {
      action = 'createFolder';
      contentType = 'fileRepository';
    }

    const section: HelpSection = {
      contentKey,
      content: contentType,
      action,
      requiredParams: [],
      optionalParams: [],
      permissions: [],
      responseDescription: '',
    };

    const reqSection = sectionContent.match(
      /\$req\s*\.\s*\$br\s*\.\s*implode\s*\(\s*['"]['"],\s*array\s*\(([\s\S]*?)\)\s*\)/
    );
    if (reqSection?.[1]) {
      section.requiredParams = extractParamsFromSection(reqSection[1]);
    }

    const optSection = sectionContent.match(
      /\$opt\s*\.\s*\$br\s*\.\s*implode\s*\(\s*['"]['"],\s*array\s*\(([\s\S]*?)\)\s*\)/
    );
    if (optSection?.[1]) {
      section.optionalParams = extractParamsFromSection(optSection[1]);
    }

    const permMatch = sectionContent.match(/\$div_perm_(\w+)/);
    if (permMatch?.[1]) {
      section.permissions = [mapPermission(permMatch[1])];
    }

    sections.set(`${contentType}_${action}`, section);
  }

  return sections;
};
