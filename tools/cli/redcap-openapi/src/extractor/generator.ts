/**
 * OpenAPI specification generator
 */

import type {
  ContentTypeInfo,
  HelpSection,
  ActionFileInfo,
  SchemaDefinition,
  Parameter,
} from './types.js';

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
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

  (responses['200'] as Record<string, unknown>).content = responseContent;

  return responses;
}

function generateParamSchema(param: Parameter): Record<string, unknown> {
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
}

function addContentSpecificParams(
  schema: Record<string, unknown>,
  content: string,
  action: string
): void {
  const properties = schema.properties as Record<string, unknown>;

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

  if (action === 'import' && !properties.data) {
    properties.data = {
      type: 'string',
      description: 'Data to import (format depends on format parameter)',
    };
    (schema.required as string[]).push('data');
  }
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

  if (action !== 'export') {
    (schema.properties as Record<string, unknown>).action = {
      type: 'string',
      enum: [action],
      description: 'Action to perform',
    };
    (schema.required as string[]).push('action');
  }

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

  addContentSpecificParams(schema, content, action);

  return schema;
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

export interface GenerateSpecOptions {
  version: string;
  contentTypes: ContentTypeInfo[];
  helpSections: Map<string, HelpSection>;
  actionFiles: Map<string, ActionFileInfo>;
  schemas: SchemaDefinition[];
}

/**
 * Generate OpenAPI 3.1.0 specification from parsed data
 */
export function generateOpenApiSpec(options: GenerateSpecOptions): Record<string, unknown> {
  const { version, contentTypes, helpSections, actionFiles, schemas } = options;

  const spec: Record<string, unknown> = {
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

  const paths: Record<string, Record<string, unknown>> = {};

  for (const ct of contentTypes) {
    const actions = ct.actions.length === 0 ? ['export'] : ct.actions;

    for (const action of actions) {
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

      (spec.components as Record<string, unknown>).schemas = {
        ...((spec.components as Record<string, unknown>).schemas as Record<string, unknown>),
        [`${operationId}Request`]: generateRequestSchema(ct.content, action, helpSection),
      };
    }
  }

  spec.paths = paths;

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

  addCommonSchemas(spec);

  return spec;
}
