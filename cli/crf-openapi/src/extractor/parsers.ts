/**
 * PHP source code parsers for REDCap API extraction
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ContentTypeInfo,
  HelpSection,
  ActionFileInfo,
  SchemaDefinition,
  Parameter,
} from './types.js';

function readFile(path: string): string {
  if (!existsSync(path)) {
    return '';
  }
  return readFileSync(path, 'utf-8');
}

/**
 * Parse index.php to extract content types and routing
 */
export function parseIndexPhp(sourcePath: string): ContentTypeInfo[] {
  const indexPath = join(sourcePath, 'API/index.php');
  const content = readFile(indexPath);

  if (!content) {
    return [];
  }

  const contentTypes: ContentTypeInfo[] = [];

  // Extract content types from the main switch statement
  const switchMatch = content.match(
    /switch\s*\(\s*\$post\s*\[\s*['"]content['"]\s*\]\s*\)\s*\{([\s\S]*?)\n\tdefault:/
  );

  if (switchMatch?.[1]) {
    const switchBlock = switchMatch[1];
    const casePattern = /case\s+['"](\w+)['"]\s*:/g;
    let match;

    while ((match = casePattern.exec(switchBlock)) !== null) {
      const contentType = match[1];
      if (contentType) {
        contentTypes.push({
          content: contentType,
          actions: [],
          hasDataParam: false,
        });
      }
    }
  }

  // Extract actions for specific content types
  const actionPattern =
    /in_array\s*\(\s*\$post\s*\[\s*['"]content['"]\s*\]\s*,\s*array\s*\(\s*([^)]+)\s*\)\s*\)/g;
  let actionMatch;

  while ((actionMatch = actionPattern.exec(content)) !== null) {
    const contentList = actionMatch[1];
    if (!contentList) continue;

    const contents = contentList.match(/['"](\w+)['"]/g)?.map((s) => s.replace(/['"]/g, '')) ?? [];

    const contextEnd = content.indexOf(';', actionMatch.index + actionMatch[0].length);
    const context = content.slice(actionMatch.index, contextEnd);

    const actionsInContext =
      context.match(/['"](\w+)['"]/g)?.map((s) => s.replace(/['"]/g, '')) ?? [];

    for (const ct of contents) {
      const info = contentTypes.find((c) => c.content === ct);
      if (info) {
        for (const action of actionsInContext) {
          if (['export', 'import', 'delete', 'switch', 'list', 'createFolder'].includes(action)) {
            if (!info.actions.includes(action)) {
              info.actions.push(action);
            }
          }
        }
      }
    }
  }

  // Determine which content types have data parameter
  const dataParamPattern =
    /\$post\s*\[\s*['"]content['"]\s*\]\s*==\s*['"](\w+)['"]\s*&&[\s\S]*?\$post\s*\[\s*['"]data['"]\s*\]/g;
  let dataMatch;

  while ((dataMatch = dataParamPattern.exec(content)) !== null) {
    const ct = dataMatch[1];
    const info = contentTypes.find((c) => c.content === ct);
    if (info) {
      info.hasDataParam = true;
    }
  }

  // Scan API directories to find actual action files
  const apiDir = join(sourcePath, 'API');
  for (const info of contentTypes) {
    const contentDir = join(apiDir, info.content);
    if (existsSync(contentDir) && statSync(contentDir).isDirectory()) {
      const files = readdirSync(contentDir);
      for (const file of files) {
        if (file.endsWith('.php')) {
          const action = file.replace('.php', '');
          if (!info.actions.includes(action)) {
            info.actions.push(action);
          }
        }
      }
    }
  }

  return contentTypes;
}

function mapContentKeyToType(key: string): string {
  const mapping: Record<string, string> = {
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
  return mapping[key] ?? key;
}

function mapPermission(perm: string): string {
  const mapping: Record<string, string> = {
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
  return mapping[perm] ?? perm;
}

function inferParamType(paramName: string): 'string' | 'integer' | 'boolean' | 'array' {
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
}

function extractParamsFromSection(section: string): Parameter[] {
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
      param.enum = enumMatch
        .map((e) => {
          const m = e.match(/['"]([^'"]+)['"]\s*\)$/);
          return m?.[1] ?? '';
        })
        .filter((v): v is string => Boolean(v));
    }

    params.push(param);
  }

  return params;
}

/**
 * Parse help.php to extract documentation and parameters
 */
export function parseHelpPhp(sourcePath: string): Map<string, HelpSection> {
  const helpPath = join(sourcePath, 'API/help.php');
  const content = readFile(helpPath);

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
      section.permissions.push(mapPermission(permMatch[1]));
    }

    sections.set(`${contentType}_${action}`, section);
  }

  return sections;
}

/**
 * Parse action files to extract validation and response info
 */
export function parseActionFiles(
  sourcePath: string,
  contentTypes: ContentTypeInfo[]
): Map<string, ActionFileInfo> {
  const actionFiles = new Map<string, ActionFileInfo>();
  const apiDir = join(sourcePath, 'API');

  for (const ct of contentTypes) {
    for (const action of ct.actions) {
      const filePath = join(apiDir, ct.content, `${action}.php`);
      if (!existsSync(filePath)) continue;

      const content = readFile(filePath);
      if (!content) continue;

      const info: ActionFileInfo = {
        content: ct.content,
        action,
        validations: [],
        responseFormats: [],
        usesDataExport: false,
      };

      const validationPattern = /RestUtility::sendResponse\s*\(\s*400\s*,\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = validationPattern.exec(content)) !== null) {
        if (match[1]) {
          info.validations.push(match[1]);
        }
      }

      if (content.includes("case 'json':")) info.responseFormats.push('json');
      if (content.includes("case 'xml':")) info.responseFormats.push('xml');
      if (content.includes("case 'csv':")) info.responseFormats.push('csv');
      if (content.includes("case 'odm':")) info.responseFormats.push('odm');

      info.usesDataExport = content.includes('DataExport::') || content.includes('getRecordsFlat');

      actionFiles.set(`${ct.content}_${action}`, info);
    }
  }

  return actionFiles;
}

function inferFieldType(fieldName: string): string {
  if (fieldName.includes('_id') || fieldName.includes('_num') || fieldName === 'purpose') {
    return 'integer';
  }
  if (
    fieldName.includes('_enabled') ||
    fieldName.startsWith('is_') ||
    fieldName.startsWith('has_')
  ) {
    return 'boolean';
  }
  if (fieldName.includes('_time') || fieldName.includes('_date')) {
    return 'string';
  }
  return 'string';
}

function parsePhpArrayToSchema(
  arrayContent: string,
  name: string,
  source: string
): SchemaDefinition | null {
  const schema: SchemaDefinition = {
    name,
    properties: {},
    source,
  };

  const fieldPattern = /['"](\w+)['"]\s*=>\s*['"](\w+)['"]/g;
  let match;

  while ((match = fieldPattern.exec(arrayContent)) !== null) {
    const apiField = match[2];
    if (apiField) {
      schema.properties[apiField] = {
        type: inferFieldType(apiField),
        description: `Field: ${apiField}`,
      };
    }
  }

  return Object.keys(schema.properties).length > 0 ? schema : null;
}

/**
 * Parse class files to extract data schemas
 */
export function parseClassSchemas(sourcePath: string): SchemaDefinition[] {
  const schemas: SchemaDefinition[] = [];
  const classesDir = join(sourcePath, 'Classes');

  const projectPath = join(classesDir, 'Project.php');
  const projectContent = readFile(projectPath);

  if (projectContent) {
    const exportMatch = projectContent.match(
      /getAttributesApiExportProjectInfo\s*\(\s*\)\s*\{[\s\S]*?\$project_fields\s*=\s*array\s*\(([\s\S]*?)\);/
    );
    if (exportMatch?.[1]) {
      const schema = parsePhpArrayToSchema(exportMatch[1], 'ProjectInfo', 'Project.php');
      if (schema) schemas.push(schema);
    }

    const importMatch = projectContent.match(
      /getAttributesApiImportProjectInfo\s*\(\s*\)\s*\{[\s\S]*?\$project_fields\s*=\s*array\s*\(([\s\S]*?)\);/
    );
    if (importMatch?.[1]) {
      const schema = parsePhpArrayToSchema(importMatch[1], 'ProjectSettingsImport', 'Project.php');
      if (schema) schemas.push(schema);
    }
  }

  const userRightsPath = join(classesDir, 'UserRights.php');
  const userRightsContent = readFile(userRightsPath);

  if (userRightsContent) {
    const attrMatch = userRightsContent.match(
      /getApiUserPrivilegesAttr\s*\([^)]*\)\s*\{[\s\S]*?return\s*\[([\s\S]*?)\];/
    );
    if (attrMatch?.[1]) {
      const attrs = attrMatch[1].match(/['"](\w+)['"]/g)?.map((s) => s.replace(/['"]/g, '')) ?? [];
      const schema: SchemaDefinition = {
        name: 'UserRights',
        properties: {},
        source: 'UserRights.php',
      };
      for (const attr of attrs) {
        schema.properties[attr] = { type: 'string', description: attr };
      }
      schemas.push(schema);
    }
  }

  return schemas;
}

/**
 * Parse curl examples
 */
export function parseCurlExamples(sourcePath: string): Map<string, string[]> {
  const examples = new Map<string, string[]>();
  const curlDir = join(sourcePath, 'API/examples/curl');

  if (!existsSync(curlDir)) {
    return examples;
  }

  const files = readdirSync(curlDir).filter((f) => f.endsWith('.sh'));

  for (const file of files) {
    const content = readFile(join(curlDir, file));
    if (!content) continue;

    const dataMatch = content.match(/DATA\s*=\s*["']([^"']+)["']/);
    if (dataMatch?.[1]) {
      const contentMatch = dataMatch[1].match(/content=(\w+)/);
      const actionMatch = dataMatch[1].match(/action=(\w+)/);

      if (contentMatch?.[1]) {
        const key = actionMatch?.[1]
          ? `${contentMatch[1]}_${actionMatch[1]}`
          : `${contentMatch[1]}_export`;
        const existing = examples.get(key) ?? [];
        existing.push(dataMatch[1]);
        examples.set(key, existing);
      }
    }
  }

  return examples;
}
