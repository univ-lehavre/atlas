/**
 * REDCap API Extractor - Complete OpenAPI Generation
 *
 * Analyzes REDCap PHP source code to extract comprehensive API endpoint information
 * and generate a detailed OpenAPI 3.1.0 specification.
 *
 * Sources parsed:
 * - API/index.php: content types, actions, routing logic
 * - API/help.php: documentation, parameters (required/optional), examples
 * - API/<content>/<action>.php: validation logic, response schemas
 * - Classes/*.php: data schemas (Project, UserRights, etc.)
 * - API/examples/curl/*.sh: validation examples
 *
 * Usage: pnpm analyze
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { stringify } from 'yaml';

// Configuration
const REDCAP_VERSION = process.env.REDCAP_VERSION || '14.5.10';
const OUTPUT_FILE = join(import.meta.dirname, `../specs/versions/redcap-${REDCAP_VERSION}.yaml`);

// Types
interface ApiEndpoint {
  content: string;
  action:
    | 'export'
    | 'import'
    | 'delete'
    | 'switch'
    | 'list'
    | 'createFolder'
    | 'rename'
    | 'display';
  operationId: string;
  summary: string;
  description: string;
  requiredParams: Parameter[];
  optionalParams: Parameter[];
  permissions: string[];
  responseFormat: string[];
  examples: Example[];
  sourceFiles: string[];
}

interface Parameter {
  name: string;
  type: 'string' | 'integer' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  default?: string | number | boolean;
  pattern?: string;
  items?: { type: string };
  format?: string;
}

interface Example {
  format: string;
  value: string;
}

interface ContentTypeInfo {
  content: string;
  actions: string[];
  hasDataParam: boolean;
}

// Utility functions
function readFile(path: string): string {
  if (!existsSync(path)) {
    console.warn(`File not found: ${path}`);
    return '';
  }
  return readFileSync(path, 'utf-8');
}

function findVersionedPath(): string {
  const basePath = join(import.meta.dirname, '../redcap-source/versions');

  // First, try the version from REDCAP_VERSION env var
  const versionPath = join(basePath, REDCAP_VERSION);
  if (existsSync(versionPath)) {
    // Check for nested structure (redcap_v14.5.10/redcap_v14.5.10/)
    const versionedName = `redcap_v${REDCAP_VERSION}`;
    const nestedPath = join(versionPath, versionedName);
    if (existsSync(nestedPath)) {
      return nestedPath;
    }
    return versionPath;
  }

  // Fallback: find any available version
  if (!existsSync(basePath)) {
    console.error(`REDCap versions not found at: ${basePath}`);
    process.exit(1);
  }

  const entries = readdirSync(basePath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const entryPath = join(basePath, entry.name);
      // Check for nested structure
      const innerEntries = readdirSync(entryPath, { withFileTypes: true });
      for (const inner of innerEntries) {
        if (inner.isDirectory() && inner.name.startsWith('redcap_v')) {
          return join(entryPath, inner.name);
        }
      }
      return entryPath;
    }
  }

  console.error('No REDCap version directory found');
  process.exit(1);
}

// =============================================================================
// PARSER 1: index.php - Extract content types and routing
// =============================================================================

function parseIndexPhp(sourcePath: string): ContentTypeInfo[] {
  const indexPath = join(sourcePath, 'API/index.php');
  const content = readFile(indexPath);

  if (!content) {
    console.error('Could not read API/index.php');
    return [];
  }

  const contentTypes: ContentTypeInfo[] = [];

  // Extract content types from the main switch statement (lines ~262-307)
  // Pattern: case 'contentType':
  const switchMatch = content.match(
    /switch\s*\(\s*\$post\s*\[\s*['"]content['"]\s*\]\s*\)\s*\{([\s\S]*?)\n\tdefault:/
  );

  if (switchMatch && switchMatch[1]) {
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
  // Pattern: in_array($post['content'], array('fileRepository', 'file', ...)) && $action
  const actionPattern =
    /in_array\s*\(\s*\$post\s*\[\s*['"]content['"]\s*\]\s*,\s*array\s*\(\s*([^)]+)\s*\)\s*\)/g;
  let actionMatch;

  while ((actionMatch = actionPattern.exec(content)) !== null) {
    const contentList = actionMatch[1];
    const contents = contentList.match(/['"](\w+)['"]/g)?.map((s) => s.replace(/['"]/g, '')) || [];

    // Find actions defined nearby
    const contextEnd = content.indexOf(';', actionMatch.index + actionMatch[0].length);
    const context = content.substring(actionMatch.index, contextEnd);

    const actionsInContext =
      context.match(/['"](\w+)['"]/g)?.map((s) => s.replace(/['"]/g, '')) || [];

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

  // Determine which content types have data parameter (for import)
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

  console.log(`Parsed index.php: found ${contentTypes.length} content types`);
  return contentTypes;
}

// =============================================================================
// PARSER 2: help.php - Extract documentation and parameters
// =============================================================================

interface HelpSection {
  contentKey: string; // e.g., 'exp_records', 'imp_records'
  content: string; // e.g., 'record'
  action: string; // e.g., 'export', 'import'
  requiredParams: Parameter[];
  optionalParams: Parameter[];
  permissions: string[];
  responseDescription: string;
}

function parseHelpPhp(sourcePath: string): Map<string, HelpSection> {
  const helpPath = join(sourcePath, 'API/help.php');
  const content = readFile(helpPath);

  if (!content) {
    console.error('Could not read API/help.php');
    return new Map();
  }

  const sections = new Map<string, HelpSection>();

  // Find all content sections: if($content == 'xxx')
  const sectionPattern =
    /if\s*\(\s*\$content\s*==\s*['"](\w+)['"]\s*\)\s*\{([\s\S]*?)(?=\nif\s*\(\s*\$content|\n\/\/\s+\w|$)/g;

  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    const contentKey = match[1];
    const sectionContent = match[2];

    // Determine action from content key
    let action = 'export';
    let contentType = contentKey;

    if (contentKey.startsWith('exp_')) {
      action = 'export';
      contentType = mapContentKeyToType(contentKey.substring(4));
    } else if (contentKey.startsWith('imp_')) {
      action = 'import';
      contentType = mapContentKeyToType(contentKey.substring(4));
    } else if (contentKey.startsWith('del_')) {
      action = 'delete';
      contentType = mapContentKeyToType(contentKey.substring(4));
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

    // Extract required parameters
    // Pattern: $div_acp_token, RCView::span($aci, 'paramName')
    const reqSection = sectionContent.match(
      /\$req\s*\.\s*\$br\s*\.\s*implode\s*\(\s*['"]['"],\s*array\s*\(([\s\S]*?)\)\s*\)/
    );
    if (reqSection) {
      const params = extractParamsFromSection(reqSection[1]);
      section.requiredParams = params;
    }

    // Extract optional parameters
    const optSection = sectionContent.match(
      /\$opt\s*\.\s*\$br\s*\.\s*implode\s*\(\s*['"]['"],\s*array\s*\(([\s\S]*?)\)\s*\)/
    );
    if (optSection) {
      const params = extractParamsFromSection(optSection[1]);
      section.optionalParams = params;
    }

    // Extract permissions
    const permMatch = sectionContent.match(/\$div_perm_(\w+)/);
    if (permMatch) {
      section.permissions.push(mapPermission(permMatch[1]));
    }

    sections.set(`${contentType}_${action}`, section);
  }

  console.log(`Parsed help.php: found ${sections.size} documented endpoints`);
  return sections;
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
  return mapping[key] || key;
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
  return mapping[perm] || perm;
}

function extractParamsFromSection(section: string): Parameter[] {
  const params: Parameter[] = [];

  // Pattern: RCView::span($aci, 'paramName') . $br . 'description'
  // Or: RCView::div($acp, RCView::span($aci, 'paramName') . $br . $lang['xxx'])
  const paramPattern = /RCView::span\s*\(\s*\$aci\s*,\s*['"](\w+)['"]\s*\)/g;

  let match;
  while ((match = paramPattern.exec(section)) !== null) {
    const paramName = match[1];

    // Skip if already added or is a standard param handled elsewhere
    if (params.some((p) => p.name === paramName)) continue;

    const param: Parameter = {
      name: paramName,
      type: inferParamType(paramName),
      description: `Parameter: ${paramName}`,
    };

    // Try to extract enum values if present
    const enumMatch = section
      .substring(match.index, match.index + 500)
      .match(/RCView::li\s*\(\s*\$ae\s*,\s*['"]([^'"]+)['"]/g);
    if (enumMatch && enumMatch.length > 1) {
      param.enum = enumMatch
        .map((e) => {
          const m = e.match(/['"]([^'"]+)['"]\s*\)$/);
          return m ? m[1] : '';
        })
        .filter(Boolean);
    }

    params.push(param);
  }

  return params;
}

function inferParamType(paramName: string): 'string' | 'integer' | 'boolean' | 'array' {
  // Array parameters
  if (['records', 'fields', 'forms', 'events', 'arms', 'dags'].includes(paramName)) {
    return 'array';
  }

  // Boolean parameters
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

  // Integer parameters
  if (
    ['report_id', 'arm', 'repeat_instance', 'doc_id', 'folder_id', 'dag_id', 'role_id'].includes(
      paramName
    )
  ) {
    return 'integer';
  }

  return 'string';
}

// =============================================================================
// PARSER 3: API/<content>/<action>.php - Extract validation and response info
// =============================================================================

interface ActionFileInfo {
  content: string;
  action: string;
  validations: string[];
  responseFormats: string[];
  usesDataExport: boolean;
}

function parseActionFiles(
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

      // Extract validations (RestUtility::sendResponse with 400)
      const validationPattern = /RestUtility::sendResponse\s*\(\s*400\s*,\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = validationPattern.exec(content)) !== null) {
        info.validations.push(match[1]);
      }

      // Check response formats
      if (content.includes("case 'json':")) info.responseFormats.push('json');
      if (content.includes("case 'xml':")) info.responseFormats.push('xml');
      if (content.includes("case 'csv':")) info.responseFormats.push('csv');
      if (content.includes("case 'odm':")) info.responseFormats.push('odm');

      // Check if uses DataExport class
      info.usesDataExport = content.includes('DataExport::') || content.includes('getRecordsFlat');

      actionFiles.set(`${ct.content}_${action}`, info);
    }
  }

  console.log(`Parsed action files: found ${actionFiles.size} action implementations`);
  return actionFiles;
}

// =============================================================================
// PARSER 4: Classes/*.php - Extract data schemas
// =============================================================================

interface SchemaDefinition {
  name: string;
  properties: Record<string, { type: string; description: string }>;
  source: string;
}

function parseClassSchemas(sourcePath: string): SchemaDefinition[] {
  const schemas: SchemaDefinition[] = [];
  const classesDir = join(sourcePath, 'Classes');

  // Parse Project.php for getAttributesApiExportProjectInfo
  const projectPath = join(classesDir, 'Project.php');
  const projectContent = readFile(projectPath);

  if (projectContent) {
    // Extract export attributes
    const exportMatch = projectContent.match(
      /getAttributesApiExportProjectInfo\s*\(\s*\)\s*\{[\s\S]*?\$project_fields\s*=\s*array\s*\(([\s\S]*?)\);/
    );
    if (exportMatch) {
      const schema = parsePhpArrayToSchema(exportMatch[1], 'ProjectInfo', 'Project.php');
      if (schema) schemas.push(schema);
    }

    // Extract import attributes
    const importMatch = projectContent.match(
      /getAttributesApiImportProjectInfo\s*\(\s*\)\s*\{[\s\S]*?\$project_fields\s*=\s*array\s*\(([\s\S]*?)\);/
    );
    if (importMatch) {
      const schema = parsePhpArrayToSchema(importMatch[1], 'ProjectSettingsImport', 'Project.php');
      if (schema) schemas.push(schema);
    }
  }

  // Parse UserRights.php for user attributes
  const userRightsPath = join(classesDir, 'UserRights.php');
  const userRightsContent = readFile(userRightsPath);

  if (userRightsContent) {
    const attrMatch = userRightsContent.match(
      /getApiUserPrivilegesAttr\s*\([^)]*\)\s*\{[\s\S]*?return\s*\[([\s\S]*?)\];/
    );
    if (attrMatch) {
      const attrs = attrMatch[1].match(/['"](\w+)['"]/g)?.map((s) => s.replace(/['"]/g, '')) || [];
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

  console.log(`Parsed class schemas: found ${schemas.length} data schemas`);
  return schemas;
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

  // Pattern: 'db_field'=>'api_field' or 'field'=>'field'
  const fieldPattern = /['"](\w+)['"]\s*=>\s*['"](\w+)['"]/g;
  let match;

  while ((match = fieldPattern.exec(arrayContent)) !== null) {
    const apiField = match[2];
    schema.properties[apiField] = {
      type: inferFieldType(apiField),
      description: `Field: ${apiField}`,
    };
  }

  return Object.keys(schema.properties).length > 0 ? schema : null;
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
    return 'string'; // datetime format
  }
  return 'string';
}

// =============================================================================
// PARSER 5: examples/curl/*.sh - Extract example calls
// =============================================================================

function parseCurlExamples(sourcePath: string): Map<string, string[]> {
  const examples = new Map<string, string[]>();
  const curlDir = join(sourcePath, 'API/examples/curl');

  if (!existsSync(curlDir)) {
    console.log('No curl examples directory found');
    return examples;
  }

  const files = readdirSync(curlDir).filter((f) => f.endsWith('.sh'));

  for (const file of files) {
    const content = readFile(join(curlDir, file));
    if (!content) continue;

    // Extract DATA parameter
    const dataMatch = content.match(/DATA\s*=\s*["']([^"']+)["']/);
    if (dataMatch) {
      // Parse content and action from DATA
      const contentMatch = dataMatch[1].match(/content=(\w+)/);
      const actionMatch = dataMatch[1].match(/action=(\w+)/);

      if (contentMatch) {
        const key = actionMatch
          ? `${contentMatch[1]}_${actionMatch[1]}`
          : `${contentMatch[1]}_export`;
        if (!examples.has(key)) {
          examples.set(key, []);
        }
        examples.get(key)!.push(dataMatch[1]);
      }
    }
  }

  console.log(`Parsed curl examples: found ${examples.size} example sets`);
  return examples;
}

// =============================================================================
// GENERATOR: OpenAPI 3.1.0 Specification
// =============================================================================

function generateOpenApiSpec(
  contentTypes: ContentTypeInfo[],
  helpSections: Map<string, HelpSection>,
  actionFiles: Map<string, ActionFileInfo>,
  schemas: SchemaDefinition[],
  examples: Map<string, string[]>
): object {
  const spec: Record<string, unknown> = {
    openapi: '3.1.0',
    info: {
      title: 'REDCap API',
      version: '14.5.10',
      description:
        'OpenAPI specification for REDCap API, extracted from REDCap v14.5.10 source code.\n\n' +
        'All API operations use a single POST endpoint with form-urlencoded data.\n' +
        'The `content` parameter determines the resource type, and `action` determines the operation.',
      contact: {
        name: 'REDCap',
        url: 'https://projectredcap.org/',
      },
      license: {
        name: 'REDCap License',
        url: 'https://projectredcap.org/partners/termsofuse/',
      },
    },
    servers: [
      {
        url: '{baseUrl}',
        description: 'REDCap server',
        variables: {
          baseUrl: {
            default: 'https://redcap.example.com',
            description: 'Base URL of your REDCap installation',
          },
        },
      },
    ],
    security: [{ apiToken: [] }],
    tags: generateTags(contentTypes),
    paths: {},
    components: {
      securitySchemes: {
        apiToken: {
          type: 'apiKey',
          in: 'body',
          name: 'token',
          description: 'REDCap API token (32 or 64 character hex string)',
        },
      },
      schemas: {},
      parameters: generateCommonParameters(),
    },
  };

  // Generate paths for each endpoint
  const paths: Record<string, Record<string, unknown>> = {};

  for (const ct of contentTypes) {
    if (ct.actions.length === 0) {
      ct.actions = ['export']; // Default action
    }

    for (const action of ct.actions) {
      const key = `${ct.content}_${action}`;
      const helpSection = helpSections.get(key);
      const actionFile = actionFiles.get(key);

      const operationId = `${action}${capitalizeFirst(ct.content)}`;
      const pathKey = `/api/?content=${ct.content}&action=${action}`;

      if (!paths[pathKey]) {
        paths[pathKey] = {};
      }

      const operation: Record<string, unknown> = {
        operationId,
        tags: [ct.content],
        summary: `${capitalizeFirst(action)} ${ct.content}`,
        description: generateDescription(ct.content, action, helpSection),
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                $ref: `#/components/schemas/${operationId}Request`,
              },
            },
          },
        },
        responses: generateResponses(action, actionFile),
      };

      paths[pathKey].post = operation;

      // Generate request schema
      (spec.components as Record<string, unknown>).schemas = {
        ...((spec.components as Record<string, unknown>).schemas as Record<string, unknown>),
        [`${operationId}Request`]: generateRequestSchema(ct.content, action, helpSection),
      };
    }
  }

  spec.paths = paths;

  // Add data schemas from classes
  for (const schema of schemas) {
    const schemaObj: Record<string, unknown> = {
      type: 'object',
      description: `Schema extracted from ${schema.source}`,
      properties: {},
    };

    for (const [propName, propDef] of Object.entries(schema.properties)) {
      (schemaObj.properties as Record<string, unknown>)[propName] = {
        type:
          propDef.type === 'boolean'
            ? 'boolean'
            : propDef.type === 'integer'
              ? 'integer'
              : 'string',
        description: propDef.description,
      };
    }

    ((spec.components as Record<string, unknown>).schemas as Record<string, unknown>)[schema.name] =
      schemaObj;
  }

  // Add common schemas
  addCommonSchemas(spec);

  return spec;
}

function generateTags(contentTypes: ContentTypeInfo[]): object[] {
  const tagGroups: Record<string, string[]> = {
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
  };

  const tags: object[] = [];
  const usedContents = new Set<string>();

  for (const [group, contents] of Object.entries(tagGroups)) {
    for (const content of contents) {
      if (contentTypes.some((ct) => ct.content === content)) {
        tags.push({
          name: content,
          description: `${group} operations`,
        });
        usedContents.add(content);
      }
    }
  }

  // Add any remaining content types
  for (const ct of contentTypes) {
    if (!usedContents.has(ct.content)) {
      tags.push({
        name: ct.content,
        description: `${ct.content} operations`,
      });
    }
  }

  return tags;
}

function generateCommonParameters(): Record<string, unknown> {
  return {
    token: {
      name: 'token',
      in: 'query',
      required: true,
      schema: {
        type: 'string',
        pattern: '^[A-Fa-f0-9]{32,64}$',
      },
      description: 'REDCap API token',
    },
    format: {
      name: 'format',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        enum: ['json', 'csv', 'xml', 'odm'],
        default: 'json',
      },
      description: 'Response format',
    },
    returnFormat: {
      name: 'returnFormat',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        enum: ['json', 'csv', 'xml'],
        default: 'json',
      },
      description: 'Format for error messages',
    },
  };
}

function generateDescription(content: string, action: string, helpSection?: HelpSection): string {
  let desc = `${capitalizeFirst(action)} ${content} data via REDCap API.\n\n`;

  if (helpSection && helpSection.permissions.length > 0) {
    desc += `**Required permissions:** ${helpSection.permissions.join(', ')}\n\n`;
  }

  return desc;
}

function generateResponses(action: string, actionFile?: ActionFileInfo): Record<string, unknown> {
  const responses: Record<string, unknown> = {
    '200': {
      description: 'Successful operation',
      content: {},
    },
    '400': {
      description: 'Bad request - invalid parameters',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
    '403': {
      description: 'Forbidden - invalid token or insufficient permissions',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  };

  // Add response content types based on action file analysis
  const formats = actionFile?.responseFormats || ['json', 'csv', 'xml'];
  const responseContent: Record<string, unknown> = {};

  if (formats.includes('json')) {
    responseContent['application/json'] = {
      schema: { type: action === 'export' ? 'array' : 'object' },
    };
  }
  if (formats.includes('csv')) {
    responseContent['text/csv'] = {
      schema: { type: 'string' },
    };
  }
  if (formats.includes('xml')) {
    responseContent['text/xml'] = {
      schema: { type: 'string' },
    };
  }

  (responses['200'] as Record<string, unknown>).content = responseContent;

  return responses;
}

function generateRequestSchema(
  content: string,
  action: string,
  helpSection?: HelpSection
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: 'object',
    required: ['token', 'content'],
    properties: {
      token: {
        type: 'string',
        pattern: '^[A-Fa-f0-9]{32,64}$',
        description: 'API token',
      },
      content: {
        type: 'string',
        enum: [content],
        description: 'Content type',
      },
      format: {
        type: 'string',
        enum: ['json', 'csv', 'xml', 'odm'],
        default: 'json',
        description: 'Response format',
      },
      returnFormat: {
        type: 'string',
        enum: ['json', 'csv', 'xml'],
        default: 'json',
        description: 'Format for error messages',
      },
    },
  };

  // Add action if not export
  if (action !== 'export') {
    (schema.properties as Record<string, unknown>).action = {
      type: 'string',
      enum: [action],
      description: 'Action to perform',
    };
    (schema.required as string[]).push('action');
  }

  // Add parameters from help section
  if (helpSection) {
    for (const param of helpSection.requiredParams) {
      if (!['token', 'content', 'format', 'action'].includes(param.name)) {
        (schema.properties as Record<string, unknown>)[param.name] = generateParamSchema(param);
        if (!(schema.required as string[]).includes(param.name)) {
          (schema.required as string[]).push(param.name);
        }
      }
    }

    for (const param of helpSection.optionalParams) {
      if (!['token', 'content', 'format', 'action', 'returnFormat'].includes(param.name)) {
        (schema.properties as Record<string, unknown>)[param.name] = generateParamSchema(param);
      }
    }
  }

  // Add common parameters based on content type
  addContentSpecificParams(schema, content, action);

  return schema;
}

function generateParamSchema(param: Parameter): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    description: param.description,
  };

  if (param.type === 'array') {
    schema.type = 'array';
    schema.items = param.items || { type: 'string' };
  } else if (param.type === 'boolean') {
    schema.type = 'string';
    schema.enum = ['true', 'false', '0', '1'];
  } else if (param.type === 'integer') {
    schema.type = 'integer';
  } else {
    schema.type = 'string';
  }

  if (param.enum && param.type !== 'boolean') {
    schema.enum = param.enum;
  }

  if (param.default !== undefined) {
    schema.default = param.default;
  }

  if (param.pattern) {
    schema.pattern = param.pattern;
  }

  return schema;
}

function addContentSpecificParams(
  schema: Record<string, unknown>,
  content: string,
  action: string
): void {
  const properties = schema.properties as Record<string, unknown>;

  // Records export specific params
  if (content === 'record' && action === 'export') {
    if (!properties.records) {
      properties.records = {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of record names to export (empty = all)',
      };
    }
    if (!properties.fields) {
      properties.fields = {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of field names to export (empty = all)',
      };
    }
    if (!properties.forms) {
      properties.forms = {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of form names to export (empty = all)',
      };
    }
    if (!properties.events) {
      properties.events = {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of unique event names to export (longitudinal only)',
      };
    }
    if (!properties.type) {
      properties.type = {
        type: 'string',
        enum: ['flat', 'eav'],
        default: 'flat',
        description: 'Export type (flat or EAV)',
      };
    }
    if (!properties.rawOrLabel) {
      properties.rawOrLabel = {
        type: 'string',
        enum: ['raw', 'label'],
        default: 'raw',
        description: 'Export raw values or labels',
      };
    }
    if (!properties.exportSurveyFields) {
      properties.exportSurveyFields = {
        type: 'string',
        enum: ['true', 'false'],
        default: 'false',
        description: 'Include survey fields',
      };
    }
    if (!properties.exportDataAccessGroups) {
      properties.exportDataAccessGroups = {
        type: 'string',
        enum: ['true', 'false'],
        default: 'false',
        description: 'Include DAG assignment',
      };
    }
    if (!properties.filterLogic) {
      properties.filterLogic = {
        type: 'string',
        description: 'Filter logic string',
      };
    }
  }

  // Records import specific params
  if (content === 'record' && action === 'import') {
    if (!properties.data) {
      properties.data = {
        type: 'string',
        description: 'Data to import (JSON, CSV, or XML)',
      };
      (schema.required as string[]).push('data');
    }
    if (!properties.overwriteBehavior) {
      properties.overwriteBehavior = {
        type: 'string',
        enum: ['normal', 'overwrite'],
        default: 'normal',
        description: 'Overwrite behavior',
      };
    }
    if (!properties.forceAutoNumber) {
      properties.forceAutoNumber = {
        type: 'string',
        enum: ['true', 'false'],
        default: 'false',
        description: 'Force auto-numbering',
      };
    }
    if (!properties.returnContent) {
      properties.returnContent = {
        type: 'string',
        enum: ['count', 'ids', 'auto_ids', 'nothing'],
        default: 'count',
        description: 'What to return',
      };
    }
  }

  // Records delete specific params
  if (content === 'record' && action === 'delete') {
    if (!properties.records) {
      properties.records = {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of record names to delete',
      };
      (schema.required as string[]).push('records');
    }
  }

  // File operations
  if (content === 'file') {
    if (!properties.record) {
      properties.record = {
        type: 'string',
        description: 'Record name',
      };
      (schema.required as string[]).push('record');
    }
    if (!properties.field) {
      properties.field = {
        type: 'string',
        description: 'Field name containing the file',
      };
      (schema.required as string[]).push('field');
    }
    if (!properties.event) {
      properties.event = {
        type: 'string',
        description: 'Unique event name (longitudinal only)',
      };
    }
    if (!properties.repeat_instance) {
      properties.repeat_instance = {
        type: 'integer',
        description: 'Repeat instance number',
      };
    }
  }

  // Import operations need data param
  if (action === 'import' && !properties.data) {
    properties.data = {
      type: 'string',
      description: 'Data to import (format depends on format parameter)',
    };
    (schema.required as string[]).push('data');
  }
}

function addCommonSchemas(spec: Record<string, unknown>): void {
  const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;

  schemas.Error = {
    type: 'object',
    properties: {
      error: {
        type: 'string',
        description: 'Error message',
      },
    },
    required: ['error'],
  };

  schemas.Record = {
    type: 'object',
    additionalProperties: true,
    description: 'A REDCap record (structure depends on project)',
  };

  schemas.ImportResponse = {
    type: 'object',
    properties: {
      count: {
        type: 'integer',
        description: 'Number of records imported',
      },
    },
  };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('REDCap API Extractor - Complete OpenAPI Generation');
  console.log('='.repeat(50));
  console.log();

  // Find REDCap source path
  const sourcePath = findVersionedPath();
  console.log(`REDCap version: ${REDCAP_VERSION}`);
  console.log(`Source path: ${sourcePath}`);
  console.log();

  // Parse all sources
  console.log('Parsing sources...');
  console.log('-'.repeat(30));

  const contentTypes = parseIndexPhp(sourcePath);
  const helpSections = parseHelpPhp(sourcePath);
  const actionFiles = parseActionFiles(sourcePath, contentTypes);
  const schemas = parseClassSchemas(sourcePath);
  const examples = parseCurlExamples(sourcePath);

  console.log();
  console.log('Generating OpenAPI specification...');
  console.log('-'.repeat(30));

  const spec = generateOpenApiSpec(contentTypes, helpSections, actionFiles, schemas, examples);

  // Write output
  const yamlOutput = stringify(spec, {
    lineWidth: 0,
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  });

  writeFileSync(OUTPUT_FILE, yamlOutput, 'utf-8');

  console.log(`\nOpenAPI spec written to: ${OUTPUT_FILE}`);
  console.log();

  // Summary
  console.log('Summary:');
  console.log(`  - Content types: ${contentTypes.length}`);
  console.log(`  - Documented endpoints: ${helpSections.size}`);
  console.log(`  - Action implementations: ${actionFiles.size}`);
  console.log(`  - Data schemas: ${schemas.length}`);
  console.log(`  - Curl examples: ${examples.size}`);

  // List all endpoints
  console.log('\nEndpoints extracted:');
  for (const ct of contentTypes) {
    for (const action of ct.actions.length ? ct.actions : ['export']) {
      const key = `${ct.content}_${action}`;
      const hasHelp = helpSections.has(key) ? '✓' : ' ';
      const hasImpl = actionFiles.has(key) ? '✓' : ' ';
      console.log(`  [${hasHelp}${hasImpl}] ${ct.content}/${action}`);
    }
  }
}

main().catch(console.error);
