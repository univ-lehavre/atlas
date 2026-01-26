/**
 * OpenAPI specification generator
 *
 * Pure function that generates OpenAPI 3.1.0 specification from parsed REDCap data.
 */

import type {
  ContentTypeInfo,
  HelpSection,
  ActionFileInfo,
  Parameter,
  GenerateSpecOptions,
  OpenApiSpec,
} from './types.js';

const capitalizeFirst = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

const TAG_GROUPS: Readonly<Record<string, readonly string[]>> = {
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

const generateTags = (contentTypes: readonly ContentTypeInfo[]): readonly object[] => {
  const tags: object[] = [];
  const usedContents = new Set<string>();

  for (const [group, contents] of Object.entries(TAG_GROUPS)) {
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

  for (const ct of contentTypes) {
    if (!usedContents.has(ct.content)) {
      tags.push({
        name: ct.content,
        description: `${ct.content} operations`,
      });
    }
  }

  return tags;
};

const generateCommonParameters = (): Readonly<Record<string, unknown>> => ({
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
});

const generateDescription = (
  content: string,
  action: string,
  helpSection: HelpSection | undefined
): string => {
  let desc = `${capitalizeFirst(action)} ${content} data via REDCap API.\n\n`;

  if (helpSection && helpSection.permissions.length > 0) {
    desc += `**Required permissions:** ${helpSection.permissions.join(', ')}\n\n`;
  }

  return desc;
};

const generateResponses = (
  action: string,
  actionFile: ActionFileInfo | undefined
): Readonly<Record<string, unknown>> => {
  const formats = actionFile?.responseFormats ?? ['json', 'csv', 'xml'];
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

  return {
    '200': {
      description: 'Successful operation',
      content: responseContent,
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
};

const generateParamSchema = (param: Parameter): Readonly<Record<string, unknown>> => {
  const schema: Record<string, unknown> = {
    description: param.description,
  };

  if (param.type === 'array') {
    schema.type = 'array';
    schema.items = param.items ?? { type: 'string' };
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
};

const addContentSpecificParams = (
  properties: Record<string, unknown>,
  required: string[],
  content: string,
  action: string
): void => {
  if (content === 'record' && action === 'export') {
    properties.records ??= {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of record names to export (empty = all)',
    };
    properties.fields ??= {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of field names to export (empty = all)',
    };
    properties.forms ??= {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of form names to export (empty = all)',
    };
    properties.events ??= {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of unique event names to export (longitudinal only)',
    };
    properties.type ??= {
      type: 'string',
      enum: ['flat', 'eav'],
      default: 'flat',
      description: 'Export type (flat or EAV)',
    };
    properties.rawOrLabel ??= {
      type: 'string',
      enum: ['raw', 'label'],
      default: 'raw',
      description: 'Export raw values or labels',
    };
    properties.exportSurveyFields ??= {
      type: 'string',
      enum: ['true', 'false'],
      default: 'false',
      description: 'Include survey fields',
    };
    properties.exportDataAccessGroups ??= {
      type: 'string',
      enum: ['true', 'false'],
      default: 'false',
      description: 'Include DAG assignment',
    };
    properties.filterLogic ??= {
      type: 'string',
      description: 'Filter logic string',
    };
  }

  if (content === 'record' && action === 'import') {
    if (!properties.data) {
      properties.data = {
        type: 'string',
        description: 'Data to import (JSON, CSV, or XML)',
      };
      required.push('data');
    }
    properties.overwriteBehavior ??= {
      type: 'string',
      enum: ['normal', 'overwrite'],
      default: 'normal',
      description: 'Overwrite behavior',
    };
    properties.forceAutoNumber ??= {
      type: 'string',
      enum: ['true', 'false'],
      default: 'false',
      description: 'Force auto-numbering',
    };
    properties.returnContent ??= {
      type: 'string',
      enum: ['count', 'ids', 'auto_ids', 'nothing'],
      default: 'count',
      description: 'What to return',
    };
  }

  if (content === 'record' && action === 'delete') {
    if (!properties.records) {
      properties.records = {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of record names to delete',
      };
      required.push('records');
    }
  }

  if (content === 'file') {
    if (!properties.record) {
      properties.record = { type: 'string', description: 'Record name' };
      required.push('record');
    }
    if (!properties.field) {
      properties.field = { type: 'string', description: 'Field name containing the file' };
      required.push('field');
    }
    properties.event ??= {
      type: 'string',
      description: 'Unique event name (longitudinal only)',
    };
    properties.repeat_instance ??= {
      type: 'integer',
      description: 'Repeat instance number',
    };
  }

  if (action === 'import' && !properties.data) {
    properties.data = {
      type: 'string',
      description: 'Data to import (format depends on format parameter)',
    };
    required.push('data');
  }
};

const generateRequestSchema = (
  content: string,
  action: string,
  helpSection: HelpSection | undefined
): Readonly<Record<string, unknown>> => {
  const required: string[] = ['token', 'content'];
  const properties: Record<string, unknown> = {
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
  };

  if (action !== 'export') {
    properties.action = {
      type: 'string',
      enum: [action],
      description: 'Action to perform',
    };
    required.push('action');
  }

  if (helpSection) {
    for (const param of helpSection.requiredParams) {
      if (!['token', 'content', 'format', 'action'].includes(param.name)) {
        properties[param.name] = generateParamSchema(param);
        if (!required.includes(param.name)) {
          required.push(param.name);
        }
      }
    }

    for (const param of helpSection.optionalParams) {
      if (!['token', 'content', 'format', 'action', 'returnFormat'].includes(param.name)) {
        properties[param.name] = generateParamSchema(param);
      }
    }
  }

  addContentSpecificParams(properties, required, content, action);

  return {
    type: 'object',
    required,
    properties,
  };
};

const generateCommonSchemas = (): Readonly<Record<string, unknown>> => ({
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'string',
        description: 'Error message',
      },
    },
    required: ['error'],
  },
  Record: {
    type: 'object',
    additionalProperties: true,
    description: 'A REDCap record (structure depends on project)',
  },
  ImportResponse: {
    type: 'object',
    properties: {
      count: {
        type: 'integer',
        description: 'Number of records imported',
      },
    },
  },
});

/**
 * Generate OpenAPI 3.1.0 specification from parsed REDCap data
 *
 * This is a pure function that takes parsed data structures and returns
 * a complete OpenAPI specification object.
 *
 * @param options - Generation options with parsed data
 * @returns OpenAPI specification object
 */
export const generateOpenApiSpec = (options: GenerateSpecOptions): OpenApiSpec => {
  const { version, contentTypes, helpSections, actionFiles, schemas } = options;

  const paths: Record<string, Record<string, unknown>> = {};
  const componentSchemas: Record<string, unknown> = { ...generateCommonSchemas() };

  for (const ct of contentTypes) {
    const actions = ct.actions.length === 0 ? ['export'] : ct.actions;

    for (const action of actions) {
      const key = `${ct.content}_${action}`;
      const helpSection = helpSections.get(key);
      const actionFile = actionFiles.get(key);

      const operationId = `${action}${capitalizeFirst(ct.content)}`;
      const pathKey = `/api/?content=${ct.content}&action=${action}`;

      paths[pathKey] ??= {};

      paths[pathKey].post = {
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

      componentSchemas[`${operationId}Request`] = generateRequestSchema(
        ct.content,
        action,
        helpSection
      );
    }
  }

  // Add extracted schemas
  for (const schema of schemas) {
    const schemaProps: Record<string, unknown> = {};

    for (const [propName, propDef] of Object.entries(schema.properties)) {
      schemaProps[propName] = {
        type:
          propDef.type === 'boolean'
            ? 'boolean'
            : propDef.type === 'integer'
              ? 'integer'
              : 'string',
        description: propDef.description,
      };
    }

    componentSchemas[schema.name] = {
      type: 'object',
      description: `Schema extracted from ${schema.source}`,
      properties: schemaProps,
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'REDCap API',
      version,
      description:
        'OpenAPI specification for REDCap API, extracted from REDCap source code.\n\n' +
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
    paths,
    components: {
      securitySchemes: {
        apiToken: {
          type: 'apiKey',
          in: 'body',
          name: 'token',
          description: 'REDCap API token (32 or 64 character hex string)',
        },
      },
      schemas: componentSchemas,
      parameters: generateCommonParameters(),
    },
  };
};
