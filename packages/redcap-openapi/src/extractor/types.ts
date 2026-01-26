/**
 * Types for REDCap API extraction
 */

export interface ApiEndpoint {
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

export interface Parameter {
  name: string;
  type: 'string' | 'integer' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  default?: string | number | boolean;
  pattern?: string;
  items?: { type: string };
  format?: string;
}

export interface Example {
  format: string;
  value: string;
}

export interface ContentTypeInfo {
  content: string;
  actions: string[];
  hasDataParam: boolean;
}

export interface HelpSection {
  contentKey: string;
  content: string;
  action: string;
  requiredParams: Parameter[];
  optionalParams: Parameter[];
  permissions: string[];
  responseDescription: string;
}

export interface ActionFileInfo {
  content: string;
  action: string;
  validations: string[];
  responseFormats: string[];
  usesDataExport: boolean;
}

export interface SchemaDefinition {
  name: string;
  properties: Record<string, { type: string; description: string }>;
  source: string;
}

export interface ExtractorConfig {
  version: string;
  sourcePath: string;
  outputPath: string;
}

export interface ExtractorResult {
  contentTypes: ContentTypeInfo[];
  helpSections: Map<string, HelpSection>;
  actionFiles: Map<string, ActionFileInfo>;
  schemas: SchemaDefinition[];
  examples: Map<string, string[]>;
  specPath: string;
}
