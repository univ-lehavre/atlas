/**
 * Types for REDCap API extraction
 *
 * Re-exports common types from core and adds extractor-specific types.
 */

import type { ApiAction, Parameter } from '../core/types.js';

// Re-export from core types
export type {
  ApiAction,
  Parameter,
  ParameterType,
  ContentTypeInfo,
  HelpSection,
  ActionFileInfo,
  SchemaDefinition,
} from '../core/types.js';

/** API endpoint definition for extractor */
export interface ApiEndpoint {
  content: string;
  action: ApiAction;
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

/** Example for API documentation */
export interface Example {
  format: string;
  value: string;
}

/** Configuration for the extractor */
export interface ExtractorConfig {
  version: string;
  sourcePath: string;
  outputPath: string;
}

/** Result of extraction process */
export interface ExtractorResult {
  contentTypes: import('../core/types.js').ContentTypeInfo[];
  helpSections: Map<string, import('../core/types.js').HelpSection>;
  actionFiles: Map<string, import('../core/types.js').ActionFileInfo>;
  schemas: import('../core/types.js').SchemaDefinition[];
  examples: Map<string, string[]>;
  specPath: string;
}
