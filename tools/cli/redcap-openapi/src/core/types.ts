/**
 * Core types for REDCap OpenAPI extraction
 *
 * These types represent the parsed structures from REDCap PHP source code.
 * Re-exports common types from @univ-lehavre/atlas-redcap-core.
 */

// Re-export from redcap-core
export type { ApiAction, ApiPermission } from '@univ-lehavre/atlas-redcap-core';

export {
  CONTENT_KEY_MAPPING,
  mapContentKeyToType,
  TAG_GROUPS,
  getTagGroup,
  getContentTypesInGroup,
  PERMISSION_MAPPING,
  mapPermission,
  CORE_CONTENT_TYPES,
  V15_CONTENT_TYPES,
  V16_CONTENT_TYPES,
  getContentTypesForVersion,
  isContentTypeAvailable,
  CONTENT_TYPE_ACTIONS,
  getActionsForContentType,
  isActionAvailable,
} from '@univ-lehavre/atlas-redcap-core';

/** Parameter type in API documentation */
export type ParameterType = 'string' | 'integer' | 'boolean' | 'array' | 'object';

/** API parameter definition */
export interface Parameter {
  name: string;
  type: ParameterType;
  description: string;
  enum?: string[];
  default?: string | number | boolean;
  pattern?: string;
  items?: { type: string };
  format?: string;
}

/** Content type information from index.php */
export interface ContentTypeInfo {
  content: string;
  actions: string[];
  hasDataParam: boolean;
}

/** Help section from help.php */
export interface HelpSection {
  contentKey: string;
  content: string;
  action: string;
  requiredParams: Parameter[];
  optionalParams: Parameter[];
  permissions: string[];
  responseDescription: string;
}

/** Action file information */
export interface ActionFileInfo {
  content: string;
  action: string;
  validations: string[];
  responseFormats: string[];
  usesDataExport: boolean;
}

/** Schema definition from PHP classes */
export interface SchemaDefinition {
  name: string;
  properties: Record<string, { type: string; description: string }>;
  source: string;
}

/** Options for OpenAPI spec generation */
export interface GenerateSpecOptions {
  version: string;
  contentTypes: ContentTypeInfo[];
  helpSections: Map<string, HelpSection>;
  actionFiles: Map<string, ActionFileInfo>;
  schemas: SchemaDefinition[];
}

/** Comparison result between two specs */
export interface ComparisonResult {
  status: 'match' | 'mismatch' | 'removed' | 'added';
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  message: string;
}

/** Summary of spec comparison */
export interface ComparisonSummary {
  removed: ComparisonResult[];
  added: ComparisonResult[];
  changed: ComparisonResult[];
  hasBreakingChanges: boolean;
}

/** OpenAPI specification (simplified type) */
export type OpenApiSpec = Record<string, unknown>;
