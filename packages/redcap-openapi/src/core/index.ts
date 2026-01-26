/**
 * @univ-lehavre/atlas-redcap-openapi/core
 *
 * Pure functional core for REDCap OpenAPI extraction.
 *
 * This module contains only pure functions with no I/O operations.
 * All functions take data as input and return transformed data as output.
 */

// Types
export type {
  ApiAction,
  ApiPermission,
  ParameterType,
  Parameter,
  ContentTypeInfo,
  HelpSection,
  ActionFileInfo,
  SchemaDefinition,
  GenerateSpecOptions,
  ComparisonResult,
  ComparisonSummary,
  OpenApiSpec,
} from './types.js';

// Re-exports from redcap-core (content types, mappings, permissions)
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
} from './types.js';

// Parsers
export {
  parseIndexPhp,
  parseHelpPhp,
  parseActionFile,
  parseActionFiles,
  parseProjectSchemas,
  parseUserRightsSchemas,
  parseClassSchemas,
  parseCurlExample,
  parseCurlExamples,
} from './parsers/index.js';

// Generator
export { generateOpenApiSpec } from './generator.js';

// Comparator
export { compareSchemas, comparePaths, comparePatterns, compareSpecs } from './comparator.js';
